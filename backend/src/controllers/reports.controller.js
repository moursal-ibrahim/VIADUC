import { getAll, create } from '../services/firestore.service.js';
import { calcWarehouseCashBalance } from '../utils/warehouseBalance.js';
import { asyncHandler } from '../utils/errors.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

function filterByDateRange(items, range) {
  const now = new Date();
  let from;
  if (range === 'daily') {
    from = new Date(now.setHours(0, 0, 0, 0));
  } else if (range === '2day') {
    from = new Date(now);
    from.setDate(from.getDate() - 2);
  } else if (range === 'monthly') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    return items;
  }
  return items.filter((i) => new Date(i.createdAt || i.date) >= from);
}

async function buildReportData(type, range) {
  const inventory = filterByDateRange(await getAll('inventory'), range);
  const expenses = filterByDateRange(await getAll('expenses'), range);
  const containers = filterByDateRange(await getAll('containers'), range);
  const entries = filterByDateRange(await getAll('entries'), range);
  const warehouses = await getAll('warehouses');

  const revenue = entries.reduce((s, e) => s + (e.collectedMoney || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return {
    type,
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      revenue,
      totalExpenses,
      netProfit: revenue - totalExpenses,
      inventoryCount: inventory.length,
      exportCount: containers.length,
      warehouseCount: warehouses.length,
    },
    inventory,
    expenses,
    containers,
    entries,
    warehouses,
  };
}

// ------- Every-2-days report -------
// Fixed, non-rolling 2-day periods anchored at REPORT_ANCHOR.
// First period = June 2 + June 3, 2026. Its report becomes available on June 4
// (the moment the period ends). The notification stays "due" until the admin
// downloads that specific period's report.
const REPORT_ANCHOR = new Date('2026-06-02T00:00:00'); // local time
const PERIOD_MS = 2 * 24 * 60 * 60 * 1000;

function periodBounds(index) {
  const anchor = REPORT_ANCHOR.getTime();
  const start = new Date(anchor + index * PERIOD_MS);
  const end = new Date(anchor + (index + 1) * PERIOD_MS - 1); // inclusive end (…23:59:59.999)
  const availableAt = new Date(anchor + (index + 1) * PERIOD_MS); // day after period ends
  return { start, end, availableAt };
}

// How many 2-day periods have fully completed as of `now`.
// latestIndex = -1 means the first period (June 2-3) has not finished yet.
function periodStatus(now = new Date()) {
  const elapsed = now.getTime() - REPORT_ANCHOR.getTime();
  const completed = elapsed >= PERIOD_MS ? Math.floor(elapsed / PERIOD_MS) : 0;
  return { completedCount: completed, latestIndex: completed - 1 };
}

// Per material (all warehouses): total weight + amount spent within [start, end].
// Per warehouse: remaining cash balance as of `end` (cumulative up to that date).
async function computeTwoDayReport(index) {
  const { start, end } = periodBounds(index);
  const within = (d) => {
    const t = new Date(d).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };
  const upTo = (d) => new Date(d).getTime() <= end.getTime();

  const entriesAll = await getAll('entries');
  const expensesAll = await getAll('expenses');
  const submissionsAll = await getAll('moneySubmissions');
  const fundingAll = await getAll('sellerFunding');
  const whTransfersAll = await getAll('warehouseTransfers');
  const openingBalancesAll = await getAll('warehouseOpeningBalances');
  const users = await getAll('users');
  const warehouses = await getAll('warehouses');

  const periodEntries = entriesAll.filter((e) => within(e.createdAt || e.date));

  const matMap = {};
  periodEntries.forEach((e) => {
    const key = e.productName || e.productId || 'Unknown';
    if (!matMap[key]) matMap[key] = { material: key, weight: 0, amountSpent: 0 };
    matMap[key].weight += e.weight || 0;
    matMap[key].amountSpent += e.collectedMoney || 0;
  });
  const materials = Object.values(matMap).sort((a, b) => b.weight - a.weight);
  const totalWeight = materials.reduce((s, m) => s + m.weight, 0);
  const totalSpent = materials.reduce((s, m) => s + m.amountSpent, 0);

  const warehouseBalances = warehouses.map((wh) => {
    const sellerIds = users
      .filter((u) => u.role === 'seller' && u.warehouseId === wh.id)
      .map((u) => u.id);
    const openingBalances = openingBalancesAll.filter(
      (b) => b.warehouseId === wh.id && upTo(b.openingDate || b.createdAt),
    );
    const funding = fundingAll.filter(
      (f) => sellerIds.includes(f.sellerId) && upTo(f.createdAt || f.date),
    );
    const entries = entriesAll.filter(
      (e) => e.warehouseId === wh.id && upTo(e.createdAt || e.date),
    );
    const expenses = expensesAll.filter(
      (e) => e.warehouseId === wh.id && upTo(e.createdAt || e.date),
    );
    const submissions = submissionsAll.filter(
      (m) => sellerIds.includes(m.createdBy) && upTo(m.createdAt || m.date),
    );
    const warehouseTransfers = whTransfersAll.filter(
      (t) => upTo(t.createdAt || t.date),
    );
    return {
      warehouseId: wh.id,
      name: wh.name,
      balance: calcWarehouseCashBalance(wh.id, {
        openingBalances,
        funding,
        entries,
        expenses,
        submissions,
        warehouseTransfers,
        sellerIds,
      }),
    };
  });

  return {
    range: '2day',
    periodIndex: index,
    periodFrom: start.toISOString(),
    periodTo: end.toISOString(),
    generatedAt: new Date().toISOString(),
    materials,
    totalWeight,
    totalSpent,
    warehouseBalances,
  };
}

// Which period to show in the UI preview: the latest completed one,
// or period 0 (June 2-3) while it is still in progress.
function previewIndex() {
  const { latestIndex } = periodStatus();
  return Math.max(latestIndex, 0);
}

async function downloadedPeriodIndexes() {
  const reports = await getAll('reports');
  return reports
    .filter((r) => (r.range === '2day' || r.type === 'twoDay') && typeof r.periodIndex === 'number')
    .map((r) => r.periodIndex);
}

export const getTwoDayReport = asyncHandler(async (_req, res) => {
  const idx = previewIndex();
  const { latestIndex } = periodStatus();
  const data = await computeTwoDayReport(idx);
  res.json({ ...data, complete: latestIndex >= 0 });
});

export const getTwoDayReportDue = asyncHandler(async (_req, res) => {
  const { latestIndex } = periodStatus();
  if (latestIndex < 0) {
    // First period (June 2-3) not finished yet — nothing to download before June 4.
    return res.json({ due: false, periodIndex: -1 });
  }
  const downloaded = await downloadedPeriodIndexes();
  const maxDownloaded = downloaded.length ? Math.max(...downloaded) : -1;
  const due = latestIndex > maxDownloaded;
  const { start, end, availableAt } = periodBounds(latestIndex);
  res.json({
    due,
    periodIndex: latestIndex,
    periodFrom: start.toISOString(),
    periodTo: end.toISOString(),
    availableAt: availableAt.toISOString(),
  });
});

const djf = (n) => `${Math.round(n || 0).toLocaleString('en-US')} DJF`;
const kg = (n) => `${Math.round(n || 0).toLocaleString('en-US')} kg`;

export const exportTwoDayReportPdf = asyncHandler(async (req, res) => {
  const { latestIndex } = periodStatus();
  const index = latestIndex >= 0 ? latestIndex : 0;
  const data = await computeTwoDayReport(index);

  // Record this specific period as downloaded so its notification clears
  // (and stays cleared) for that period only.
  await create('reports', {
    type: 'twoDay',
    range: '2day',
    periodIndex: index,
    periodFrom: data.periodFrom,
    periodTo: data.periodTo,
    generatedAt: data.generatedAt,
    summary: { totalWeight: data.totalWeight, totalSpent: data.totalSpent },
    createdBy: req.user.uid,
  });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=viaduc-2day-report.pdf');
  doc.pipe(res);

  doc.fontSize(18).text('Viaduc ERP - 2-Day Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555')
    .text(`Period: ${new Date(data.periodFrom).toLocaleDateString()} - ${new Date(data.periodTo).toLocaleDateString()}`, { align: 'center' })
    .text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, { align: 'center' });
  doc.fillColor('#000').moveDown(1.5);

  doc.fontSize(13).text('Materials Collected (all warehouses)');
  doc.moveDown(0.5);
  doc.font('Courier').fontSize(10);
  doc.text(`${'Material'.padEnd(28)}${'Weight'.padStart(14)}${'Amount Spent'.padStart(20)}`);
  doc.text('-'.repeat(62));
  if (data.materials.length === 0) {
    doc.text('No purchases recorded in the last 2 days.');
  } else {
    data.materials.forEach((m) => {
      doc.text(`${String(m.material).padEnd(28)}${kg(m.weight).padStart(14)}${djf(m.amountSpent).padStart(20)}`);
    });
    doc.text('-'.repeat(62));
    doc.text(`${'TOTAL'.padEnd(28)}${kg(data.totalWeight).padStart(14)}${djf(data.totalSpent).padStart(20)}`);
  }

  doc.font('Helvetica').moveDown(1.5);
  doc.fontSize(13).text('Warehouse Remaining Balance');
  doc.moveDown(0.5);
  doc.font('Courier').fontSize(10);
  doc.text(`${'Warehouse'.padEnd(28)}${'Balance'.padStart(20)}`);
  doc.text('-'.repeat(48));
  data.warehouseBalances.forEach((w) => {
    doc.text(`${String(w.name).padEnd(28)}${djf(w.balance).padStart(20)}`);
  });

  doc.end();
});

export const generateReport = asyncHandler(async (req, res) => {
  const { type = 'operational', range = 'daily' } = req.query;
  const data = await buildReportData(type, range);
  const report = await create('reports', {
    ...data,
    createdBy: req.user.uid,
  });
  res.json(report);
});

export const listReports = asyncHandler(async (_req, res) => {
  res.json(await getAll('reports'));
});

export const exportReportPdf = asyncHandler(async (req, res) => {
  const { type = 'operational', range = 'daily' } = req.query;
  const data = await buildReportData(type, range);

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=viaduc-report-${range}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('Viaduc ERP Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Type: ${type} | Range: ${range}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();
  doc.text(`Revenue: ${data.summary.revenue.toLocaleString()} DJF`);
  doc.text(`Expenses: ${data.summary.totalExpenses.toLocaleString()} DJF`);
  doc.text(`Net Profit: ${data.summary.netProfit.toLocaleString()} DJF`);
  doc.text(`Inventory Items: ${data.summary.inventoryCount}`);
  doc.text(`Exports: ${data.summary.exportCount}`);
  doc.end();
});

export const exportReportExcel = asyncHandler(async (req, res) => {
  const { type = 'operational', range = 'daily' } = req.query;
  const data = await buildReportData(type, range);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Summary');
  sheet.addRow(['Viaduc Report', type, range]);
  sheet.addRow(['Revenue', data.summary.revenue]);
  sheet.addRow(['Expenses', data.summary.totalExpenses]);
  sheet.addRow(['Net Profit', data.summary.netProfit]);

  const invSheet = workbook.addWorksheet('Inventory');
  invSheet.addRow(['Product', 'Warehouse', 'Quantity', 'Weight', 'Status', 'Date']);
  data.inventory.forEach((i) => {
    invSheet.addRow([
      i.productName,
      i.warehouseName,
      i.quantity,
      i.weight,
      i.status,
      i.createdAt,
    ]);
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename=viaduc-report-${range}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});
