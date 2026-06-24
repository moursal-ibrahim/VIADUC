import { getAll, getById, create } from '../services/firestore.service.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { calcWarehouseCashBalance } from '../utils/warehouseBalance.js';

export const getDashboardAnalytics = asyncHandler(async (_req, res) => {
  const inventory = await getAll('inventory');
  const expenses = await getAll('expenses');
  const salaries = await getAll('salaries');
  const containers = await getAll('containers');
  const entries = await getAll('entries');
  const submissions = await getAll('moneySubmissions');
  const funding = await getAll('sellerFunding');
  const warehouseTransfers = await getAll('warehouseTransfers');
  const openingBalances = await getAll('warehouseOpeningBalances');
  const users = await getAll('users');
  const warehouses = await getAll('warehouses');
  const products = await getAll('products');

  // Per-warehouse cash balance (Step 4):
  //   Opening cash + Capital Given − Purchases − Expenses − Cash Submitted + Transfers In − Transfers Out
  const warehouseCashBalances = {};
  warehouses.forEach((wh) => {
    const sellerIds = users
      .filter((u) => u.role === 'seller' && u.warehouseId === wh.id)
      .map((u) => u.id);

    warehouseCashBalances[wh.id] = calcWarehouseCashBalance(wh.id, {
      openingBalances,
      funding,
      entries,
      expenses,
      submissions,
      warehouseTransfers,
      sellerIds,
    });
  });

  // Step 10 — revenue is export selling value; buying scrap is a cost.
  const exportRevenue = containers.reduce((s, c) => s + (c.sellingValue || 0), 0);
  const shippingFees = containers.reduce((s, c) => s + (c.totalExpense || 0), 0);
  const purchaseCost = entries.reduce((s, e) => s + (e.collectedMoney || 0), 0);
  const revenue = exportRevenue;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSalaries = salaries.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = exportRevenue - purchaseCost - totalExpenses - totalSalaries - shippingFees;
  const inventoryValue = inventory.reduce((s, i) => s + (i.value || 0), 0);

  const warehouseBalances = warehouses.map((wh) => {
    const items = inventory.filter((i) => i.warehouseId === wh.id);
    return {
      name: wh.name,
      weight: items.reduce((s, i) => s + (i.weight || 0), 0),
      value: items.reduce((s, i) => s + (i.value || 0), 0),
    };
  });

  const productStats = products.map((p) => {
    const items = inventory.filter((i) => i.productId === p.id);
    return {
      name: p.name,
      weight: items.reduce((s, i) => s + (i.weight || 0), 0),
      quantity: items.reduce((s, i) => s + (i.quantity || 0), 0),
    };
  });

  // Real stock movement = materials entering a warehouse over time:
  // purchases (entries) + transfers received. Inventory rows are NOT added here
  // because each purchase already creates one (that would double-count weight).
  const stockTransfers = await getAll('transfers');
  const movementEvents = [
    ...entries.map((e) => ({ warehouseId: e.warehouseId, weight: e.weight || 0, createdAt: e.createdAt })),
    ...stockTransfers.map((t) => ({ warehouseId: t.toWarehouseId, weight: t.weight || 0, createdAt: t.date || t.createdAt })),
  ];

  const stockMovementTrends = buildMonthlyTrends(movementEvents);
  const revenueAnalytics = buildMonthlyTrends(entries, 'collectedMoney');
  const exportAnalytics = containers.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const lastMonthRevenue = revenueAnalytics.slice(-2);
  const monthlyGrowth =
    lastMonthRevenue.length === 2 && lastMonthRevenue[0].value
      ? ((lastMonthRevenue[1].value - lastMonthRevenue[0].value) / lastMonthRevenue[0].value) * 100
      : 0;

  const moneyTransfers = await getAll('moneyTransfers');
  const taajIncome = moneyTransfers
    .filter((m) => m.type === 'taaj')
    .reduce((s, m) => s + (m.amount || 0), 0);
  const bakeryIncome = moneyTransfers
    .filter((m) => m.type === 'bakery')
    .reduce((s, m) => s + (m.amount || 0), 0);
  const totalIncome = revenue + moneyTransfers.reduce((s, m) => s + (m.amount || 0), 0);

  const warehouseBalanceCards = warehouses.map((wh) => {
    const items = inventory.filter((i) => i.warehouseId === wh.id);
    const value = items.reduce((s, i) => s + (i.value || 0), 0);
    return {
      id: wh.id,
      label: wh.name.replace(' Warehouse', '').replace('Secondary ', '').toUpperCase(),
      fullName: wh.name,
      value,
    };
  });

  const inventoryHighlights = warehouses.map((wh) => {
    const items = inventory.filter((i) => i.warehouseId === wh.id);
    const byProduct = {};
    items.forEach((i) => {
      if (!byProduct[i.productId]) {
        byProduct[i.productId] = { productName: i.productName, weight: 0 };
      }
      byProduct[i.productId].weight += i.weight || 0;
    });
    const top = Object.values(byProduct).sort((a, b) => b.weight - a.weight)[0];
    return {
      warehouseId: wh.id,
      label: wh.name.replace(' Warehouse', '').replace('Secondary ', '').toUpperCase(),
      productName: top?.productName || '—',
      weight: top?.weight || 0,
    };
  });

  const metalsWeight = inventory
    .filter((i) => {
      const p = products.find((pr) => pr.id === i.productId);
      return p?.category === 'metal';
    })
    .reduce((s, i) => s + (i.weight || 0), 0);
  const batteriesWeight = inventory
    .filter((i) => {
      const p = products.find((pr) => pr.id === i.productId);
      return p?.category === 'battery';
    })
    .reduce((s, i) => s + (i.weight || 0), 0);

  const stockStatus = products.map((p) => {
    const weight = inventory
      .filter((i) => i.productId === p.id)
      .reduce((s, i) => s + (i.weight || 0), 0);
    let status = 'Stable';
    if (weight < 500) status = 'Low';
    else if (weight < 2000) status = 'Active';
    return { name: p.name, weight, status };
  });

  res.json({
    kpis: {
      totalRevenue: revenue,
      netProfit,
      inventoryValue,
      warehouseBalances: warehouseBalances.reduce((s, w) => s + w.value, 0),
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      totalExpenses: totalExpenses + totalSalaries,
      exportContainers: containers.length,
      activeWorkers: users.filter((u) => u.role === 'seller' && !u.disabled).length,
    },
    executive: {
      warehouseBalances: warehouseBalanceCards,
      warehouseCashBalances,
      totalExpenses: totalExpenses + totalSalaries,
      inventoryHighlights,
      totalIncome,
      incomeBreakdown: {
        all: totalIncome,
        taaj: taajIncome,
        bakery: bakeryIncome,
      },
      warehouseMovement: {
        '24D': buildWarehousePeriodTrends(movementEvents, warehouses, 24),
        '7D': buildWarehousePeriodTrends(movementEvents, warehouses, 7),
        '30D': buildWarehousePeriodTrends(movementEvents, warehouses, 30),
        '90D': buildWarehousePeriodTrends(movementEvents, warehouses, 90),
      },
      stockMovement: {
        '24D': buildPeriodTrends(movementEvents, 24),
        '7D': buildPeriodTrends(movementEvents, 7),
        '30D': buildPeriodTrends(movementEvents, 30),
        '90D': buildPeriodTrends(movementEvents, 90),
      },
      stockDistribution: {
        metals: metalsWeight,
        batteries: batteriesWeight,
        totalTons: Math.round((metalsWeight + batteriesWeight) / 1000 * 10) / 10,
      },
      stockStatus,
    },
    charts: {
      stockMovementTrends,
      warehousePerformance: warehouseBalances,
      productStatistics: productStats,
      revenueAnalytics,
      exportAnalytics,
      profitAnalytics: [
        { name: 'Sales', value: exportRevenue },
        { name: 'Purchases', value: purchaseCost },
        { name: 'Expenses', value: totalExpenses },
        { name: 'Salaries', value: totalSalaries },
        { name: 'Shipping', value: shippingFees },
        { name: 'Net Profit', value: netProfit },
      ],
    },
  });
});

const WHSE_CHART_LABELS = {
  wh_main: 'TORABORA',
  wh_secondary_1: 'PK12',
  wh_secondary_2: 'JAJAB',
};

function getPeriodConfig(days) {
  if (days === 24) return { bucketSize: 1, numBuckets: 24 };
  if (days <= 7) return { bucketSize: 1, numBuckets: 7 };
  if (days <= 30) return { bucketSize: 1, numBuckets: 30 };
  return { bucketSize: 7, numBuckets: 13 };
}

function getPeriodLabel(days, end, i, bucketSize) {
  if (days === 24 || (days > 7 && days <= 30)) {
    return end.toLocaleString('default', { month: 'short', day: 'numeric' });
  }
  if (days <= 7) {
    return end.toLocaleString('default', { weekday: 'short' });
  }
  return `W${Math.ceil((days - i * bucketSize) / 7)}`;
}

function buildWarehousePeriodTrends(items, warehouses, days) {
  const result = [];
  const now = new Date();
  const { bucketSize, numBuckets } = getPeriodConfig(days);

  for (let i = numBuckets - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * bucketSize);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - bucketSize + 1);
    start.setHours(0, 0, 0, 0);

    const point = { name: getPeriodLabel(days, end, i, bucketSize) };

    for (const wh of warehouses) {
      const key = WHSE_CHART_LABELS[wh.id] || wh.name;
      point[key] = items
        .filter((item) => {
          if (item.warehouseId !== wh.id) return false;
          const d = new Date(item.createdAt);
          return d >= start && d <= end;
        })
        .reduce((s, item) => s + (item.weight || 0), 0);
    }

    result.push(point);
  }
  return result;
}

function buildPeriodTrends(items, days) {
  const result = [];
  const now = new Date();
  const { bucketSize, numBuckets } = getPeriodConfig(days);

  for (let i = numBuckets - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * bucketSize);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - bucketSize + 1);
    start.setHours(0, 0, 0, 0);

    const label = getPeriodLabel(days, end, i, bucketSize);

    const value = items
      .filter((item) => {
        const d = new Date(item.createdAt);
        return d >= start && d <= end;
      })
      .reduce((s, item) => s + (item.weight || 0), 0);

    result.push({ name: label, value });
  }
  return result;
}

function buildMonthlyTrends(items, valueField = 'weight') {
  const months = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    months[key] = 0;
  }
  items.forEach((item) => {
    const d = new Date(item.createdAt);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (months[key] !== undefined) {
      months[key] += item[valueField] || item.weight || 1;
    }
  });
  return Object.entries(months).map(([name, value]) => ({ name, value }));
}

export const getSellerDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const user = await getById('users', userId);
  const warehouseId = user?.warehouseId || req.user.warehouseId;
  const today = new Date().toISOString().split('T')[0];

  const entriesAll = await getAll('entries');
  const inventoryAll = await getAll('inventory');
  const submissionsAll = await getAll('moneySubmissions');
  const fundingAll = await getAll('sellerFunding');
  const openingBalances = await getAll('warehouseOpeningBalances');
  const openingStockAll = await getAll('openingStock');
  const expenses = await getAll('expenses');
  const warehouseTransfers = await getAll('warehouseTransfers');
  const users = await getAll('users');
  const warehouses = await getAll('warehouses');

  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const sellerIds = users
    .filter((u) => u.role === 'seller' && u.warehouseId === warehouseId)
    .map((u) => u.id);

  const warehouseEntries = warehouseId
    ? entriesAll.filter((e) => e.warehouseId === warehouseId)
    : entriesAll.filter((e) => e.createdBy === userId);

  const myEntries = entriesAll.filter((e) => e.createdBy === userId);
  const todayEntries = warehouseEntries.filter((e) => e.createdAt?.startsWith(today));
  const mySubmissions = submissionsAll.filter((s) => s.createdBy === userId);
  const todaySubmissions = mySubmissions.filter((s) => s.createdAt?.startsWith(today));
  const myFunding = fundingAll.filter((f) => f.sellerId === userId);

  const whOpening = openingBalances.find((b) => b.warehouseId === warehouseId);
  const openingCash = whOpening?.cashBalance || 0;
  const openingDate = whOpening?.openingDate || openingStockAll.find((s) => s.warehouseId === warehouseId)?.openingDate || null;

  const warehouseCashBalance = warehouseId
    ? calcWarehouseCashBalance(warehouseId, {
        openingBalances,
        funding: fundingAll,
        entries: entriesAll,
        expenses,
        submissions: submissionsAll,
        warehouseTransfers,
        sellerIds,
      })
    : myFunding.reduce((s, f) => s + (f.amount || 0), 0)
      - myEntries.reduce((s, e) => s + (e.collectedMoney || 0), 0)
      - mySubmissions.reduce((s, e) => s + (e.amount || 0), 0);

  const warehouseInventory = warehouseId
    ? inventoryAll.filter((i) => i.warehouseId === warehouseId && (i.status === 'in_stock' || !i.status))
    : inventoryAll.filter((i) => i.createdBy === userId && (i.status === 'in_stock' || !i.status));

  const warehouseOpeningStock = warehouseId
    ? openingStockAll.filter((s) => s.warehouseId === warehouseId)
    : [];

  const fundedBalance = myFunding.reduce((s, f) => s + (f.amount || 0), 0);
  const warehouseFunding = fundingAll
    .filter((f) => sellerIds.includes(f.sellerId))
    .reduce((s, f) => s + (f.amount || 0), 0);
  const totalSpent = warehouseEntries.reduce((s, e) => s + (e.collectedMoney || 0), 0);
  const myTotalSpent = myEntries.reduce((s, e) => s + (e.collectedMoney || 0), 0);
  const totalSubmitted = mySubmissions.reduce((s, e) => s + (e.amount || 0), 0);
  const warehouseSubmitted = submissionsAll
    .filter((m) => sellerIds.includes(m.createdBy))
    .reduce((s, m) => s + (m.amount || 0), 0);

  res.json({
    todayEntries: todayEntries.length,
    totalWeight: todayEntries.reduce((s, e) => s + (e.weight || 0), 0),
    moneySubmitted: todaySubmissions.reduce((s, e) => s + (e.amount || 0), 0),
    assignedWarehouse: warehouseId,
    warehouseName: warehouse?.name,
    openingCash,
    openingDate,
    warehouseCashBalance,
    warehouseFunding,
    warehouseSubmitted,
    fundedBalance,
    totalSpent,
    myTotalSpent,
    totalSubmitted,
    balance: warehouseCashBalance,
    entries: warehouseEntries.slice(0, 100),
    myEntries: myEntries.slice(0, 50),
    inventory: warehouseInventory,
    openingStock: warehouseOpeningStock,
    submissions: mySubmissions.slice(0, 50),
    funding: myFunding.slice(0, 50),
    dailySummary: {
      entries: todayEntries,
      submissions: todaySubmissions,
    },
  });
});

export const fundSeller = asyncHandler(async (req, res) => {
  const { sellerId, amount, notes } = req.body;
  if (!sellerId || !amount || Number(amount) <= 0) {
    throw new AppError('Seller and a positive amount are required', 400);
  }
  const seller = await getById('users', sellerId);
  if (!seller) throw new AppError('Seller not found', 404);

  const record = await create('sellerFunding', {
    sellerId,
    sellerName: seller.name,
    amount: Number(amount),
    notes: notes || '',
    fundedBy: req.user.uid,
    fundedByName: req.user.name,
  });
  res.status(201).json(record);
});

export const listSellerFunding = asyncHandler(async (req, res) => {
  let items = await getAll('sellerFunding');
  const { sellerId } = req.query;
  if (sellerId) items = items.filter((f) => f.sellerId === sellerId);
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

export const createEntry = asyncHandler(async (req, res) => {
  const { productId, warehouseId, quantity, weight, collectedMoney, notes, sellerType, wholesaleName, pricePerKg } = req.body;
  const products = await getAll('products');
  const warehouses = await getAll('warehouses');
  const product = products.find((p) => p.id === productId);
  const warehouse = warehouses.find((w) => w.id === warehouseId);

  const entry = await create('entries', {
    productId,
    productName: product?.name,
    warehouseId,
    warehouseName: warehouse?.name,
    quantity,
    weight,
    collectedMoney: collectedMoney || 0,
    sellerType: sellerType || 'retail',
    wholesaleName: wholesaleName || null,
    pricePerKg: pricePerKg || 0,
    notes,
    createdBy: req.user.uid,
    createdByName: req.user.name,
  });

  await create('inventory', {
    productId,
    productName: product?.name,
    warehouseId,
    warehouseName: warehouse?.name,
    quantity,
    weight,
    value: collectedMoney || 0,
    status: 'in_stock',
    movementType: 'incoming',
    createdBy: req.user.uid,
    createdByName: req.user.name,
  });

  res.status(201).json(entry);
});

export const createMoneySubmission = asyncHandler(async (req, res) => {
  const submission = await create('moneySubmissions', {
    ...req.body,
    createdBy: req.user.uid,
    createdByName: req.user.name,
  });
  res.status(201).json(submission);
});
