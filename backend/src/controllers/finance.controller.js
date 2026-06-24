import { getAll, create, update, remove } from '../services/firestore.service.js';
import { asyncHandler, AppError } from '../utils/errors.js';

function filterByDate(items, from, to) {
  if (!from && !to) return items;
  return items.filter((item) => {
    const d = new Date(item.date || item.createdAt);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to)) return false;
    return true;
  });
}

function buildFinanceMonthly({ incomeRows, expenseRows }) {
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleString('default', { month: 'short' }),
      income: 0,
      expenses: 0,
    });
  }
  const byKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };
  const add = (rows, field) => {
    rows.forEach((it) => {
      const bucket = buckets.find((b) => b.key === byKey(it.date));
      if (bucket) bucket[field] += it.amount || 0;
    });
  };
  add(incomeRows, 'income');
  add(expenseRows, 'expenses');
  return buckets.map(({ name, income, expenses }) => ({ name, income, expenses }));
}

function growthPct(trends, field) {
  if (trends.length < 2) return 0;
  const cur = trends[trends.length - 1][field];
  const prev = trends[trends.length - 2][field];
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export const getFinanceDashboard = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const expenses = filterByDate(await getAll('expenses'), from, to);
  const salaries = filterByDate(await getAll('salaries'), from, to);
  const moneyTransfers = filterByDate(await getAll('moneyTransfers'), from, to);
  const entries = filterByDate(await getAll('entries'), from, to);
  const submissions = filterByDate(await getAll('moneySubmissions'), from, to);
  const funding = filterByDate(await getAll('sellerFunding'), from, to);
  const warehouseTransfers = filterByDate(await getAll('warehouseTransfers'), from, to);
  const containers = filterByDate(await getAll('containers'), from, to);
  const inventory = await getAll('inventory');

  // Step 1 — Income collection (Taaj + Bakery only). This is the manager's capital pool.
  const taajIncome = moneyTransfers
    .filter((m) => m.type === 'taaj')
    .reduce((s, m) => s + (m.amount || 0), 0);
  const bakeryIncome = moneyTransfers
    .filter((m) => m.type === 'bakery')
    .reduce((s, m) => s + (m.amount || 0), 0);
  const incomeTotal = taajIncome + bakeryIncome;

  // Step 2 — capital distributed to warehouses (via seller funding) reduces what's available.
  const totalDistributed = funding.reduce((s, f) => s + (f.amount || 0), 0);
  const availableCapital = incomeTotal - totalDistributed;

  // Step 10 — true P&L: revenue is the export selling value; buying scrap is a cost.
  const exportRevenue = containers.reduce((s, c) => s + (c.sellingValue || 0), 0);
  const shippingFees = containers.reduce((s, c) => s + (c.totalExpense || 0), 0);
  const purchaseCost = entries.reduce((s, e) => s + (e.collectedMoney || 0), 0);

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSalaries = salaries.reduce((s, e) => s + (e.amount || 0), 0);
  const transportCosts = expenses
    .filter((e) => e.category === 'transport')
    .reduce((s, e) => s + (e.amount || 0), 0);
  // transportCosts is already part of totalExpenses, so it is not subtracted again.
  const netProfit = exportRevenue - purchaseCost - totalExpenses - totalSalaries - shippingFees;
  const revenue = exportRevenue;
  const inventoryValue = inventory.reduce((s, i) => s + (i.value || 0), 0);
  const totalTransfers = moneyTransfers.reduce((s, m) => s + (m.amount || 0), 0);

  const monthlyTrends = buildFinanceMonthly({
    incomeRows: [
      ...moneyTransfers.map((m) => ({ date: m.date || m.createdAt, amount: m.amount || 0 })),
      ...containers.map((c) => ({ date: c.startDate || c.createdAt, amount: c.sellingValue || 0 })),
    ],
    expenseRows: [
      ...expenses.map((e) => ({ date: e.date || e.createdAt, amount: e.amount || 0 })),
      ...salaries.map((e) => ({ date: e.date || e.createdAt, amount: e.amount || 0 })),
      ...entries.map((e) => ({ date: e.date || e.createdAt, amount: e.collectedMoney || 0 })),
      ...containers.map((c) => ({ date: c.startDate || c.createdAt, amount: c.totalExpense || 0 })),
    ],
  });

  const growth = {
    income: growthPct(monthlyTrends, 'income'),
    expenses: growthPct(monthlyTrends, 'expenses'),
  };

  res.json({
    revenue,
    exportRevenue,
    purchaseCost,
    shippingFees,
    totalExpenses,
    totalSalaries,
    transportCosts,
    totalTransfers,
    taajIncome,
    bakeryIncome,
    incomeTotal,
    totalDistributed,
    availableCapital,
    netProfit,
    inventoryValue,
    monthlyTrends,
    growth,
    taajTransfers: moneyTransfers.filter((m) => m.type === 'taaj'),
    bakeryCollections: moneyTransfers.filter((m) => m.type === 'bakery'),
    expenses,
    salaries,
    moneyTransfers,
    warehouseTransfers,
    cashFlow: {
      inflow: revenue,
      outflow: totalExpenses + totalSalaries + transportCosts,
      net: netProfit,
    },
  });
});

export const listExpenses = asyncHandler(async (req, res) => {
  res.json(filterByDate(await getAll('expenses'), req.query.from, req.query.to));
});

export const createExpense = asyncHandler(async (req, res) => {
  res.status(201).json(
    await create('expenses', {
      ...req.body,
      createdBy: req.user.uid,
      date: req.body.date || new Date().toISOString(),
    })
  );
});

export const updateExpense = asyncHandler(async (req, res) => {
  res.json(await update('expenses', req.params.id, req.body));
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await remove('expenses', req.params.id);
  res.json({ message: 'Expense deleted' });
});

export const listSalaries = asyncHandler(async (req, res) => {
  res.json(filterByDate(await getAll('salaries'), req.query.from, req.query.to));
});

export const createSalary = asyncHandler(async (req, res) => {
  res.status(201).json(
    await create('salaries', {
      ...req.body,
      createdBy: req.user.uid,
      date: req.body.date || new Date().toISOString(),
    })
  );
});

export const listMoneyTransfers = asyncHandler(async (req, res) => {
  res.json(filterByDate(await getAll('moneyTransfers'), req.query.from, req.query.to));
});

export const listWarehouseTransfers = asyncHandler(async (req, res) => {
  const items = filterByDate(await getAll('warehouseTransfers'), req.query.from, req.query.to);
  items.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  res.json(items);
});

export const createWarehouseTransfer = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, amount, notes } = req.body;
  if (!fromWarehouseId || !toWarehouseId) {
    throw new AppError('Source and destination warehouses are required', 400);
  }
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError('Source and destination must be different', 400);
  }
  if (!amount || Number(amount) <= 0) {
    throw new AppError('Transfer amount must be greater than zero', 400);
  }
  const warehouses = await getAll('warehouses');
  const from = warehouses.find((w) => w.id === fromWarehouseId);
  const to = warehouses.find((w) => w.id === toWarehouseId);
  if (!from || !to) throw new AppError('Warehouse not found', 404);

  const transfer = await create('warehouseTransfers', {
    fromWarehouseId,
    fromWarehouseName: from.name,
    toWarehouseId,
    toWarehouseName: to.name,
    amount: Number(amount),
    notes: notes || '',
    createdBy: req.user.uid,
    date: req.body.date || new Date().toISOString(),
  });
  res.status(201).json(transfer);
});

export const createMoneyTransfer = asyncHandler(async (req, res) => {
  const { type, amount } = req.body;
  if (!['taaj', 'bakery'].includes(type)) {
    throw new AppError('Income source must be Taaj or Bakery', 400);
  }
  if (!amount || Number(amount) <= 0) {
    throw new AppError('Income amount must be greater than zero', 400);
  }
  res.status(201).json(
    await create('moneyTransfers', {
      ...req.body,
      amount: Number(amount),
      createdBy: req.user.uid,
      date: req.body.date || new Date().toISOString(),
    })
  );
});
