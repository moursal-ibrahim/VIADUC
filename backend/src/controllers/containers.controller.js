import { getAll, getById, create, update, remove } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listContainers = asyncHandler(async (req, res) => {
  let items = await getAll('containers');
  const { status, destination } = req.query;
  if (status) items = items.filter((c) => c.status === status);
  if (destination) items = items.filter((c) => c.destinationCountry === destination);
  res.json(items);
});

export const getContainer = asyncHandler(async (req, res) => {
  const c = await getById('containers', req.params.id);
  if (!c) throw new AppError('Container not found', 404);
  res.json(c);
});

const MAIN_WAREHOUSE_ID = 'wh_main';

// Step 9 — on export, deduct the shipped materials from the main warehouse inventory.
export const createContainer = asyncHandler(async (req, res) => {
  const items = req.body.items || [];
  const inventory = await getAll('inventory');

  const stockAt = (productId) =>
    inventory
      .filter(
        (i) =>
          i.warehouseId === MAIN_WAREHOUSE_ID &&
          i.productId === productId &&
          (i.status === 'in_stock' || i.status === undefined)
      )
      .reduce((s, i) => s + (i.weight || 0), 0);

  const shortages = items
    .filter((it) => it.productId && Number(it.weight) > stockAt(it.productId) + 1e-6)
    .map((it) => `${it.productName || it.productId}: need ${Number(it.weight)}kg, have ${stockAt(it.productId)}kg`);
  if (shortages.length) {
    throw new AppError(`Not enough stock at main warehouse — ${shortages.join('; ')}`, 400);
  }

  for (const it of items) {
    if (!it.productId) continue;
    let remaining = Number(it.weight) || 0;
    const rows = inventory
      .filter(
        (i) =>
          i.warehouseId === MAIN_WAREHOUSE_ID &&
          i.productId === it.productId &&
          (i.status === 'in_stock' || i.status === undefined) &&
          (i.weight || 0) > 0
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const row of rows) {
      if (remaining <= 1e-6) break;
      const rowWeight = row.weight || 0;
      const take = Math.min(rowWeight, remaining);
      const ratio = rowWeight > 0 ? take / rowWeight : 0;
      remaining -= take;
      const newWeight = rowWeight - take;
      if (newWeight <= 1e-4) {
        await remove('inventory', row.id);
      } else {
        await update('inventory', row.id, {
          weight: newWeight,
          quantity: (row.quantity || 0) - Math.round((row.quantity || 0) * ratio),
          value: (row.value || 0) * (1 - ratio),
        });
      }
    }
  }

  const container = await create('containers', {
    ...req.body,
    sellingValue: Number(req.body.sellingValue) || 0,
    status: req.body.status || 'Pending',
    createdBy: req.user.uid,
  });
  res.status(201).json(container);
});

export const updateContainer = asyncHandler(async (req, res) => {
  res.json(await update('containers', req.params.id, req.body));
});

export const deleteContainer = asyncHandler(async (req, res) => {
  await remove('containers', req.params.id);
  res.json({ message: 'Container deleted' });
});

export const getExportAnalytics = asyncHandler(async (_req, res) => {
  const containers = await getAll('containers');
  const byStatus = {};
  const byCountry = {};
  let totalWeight = 0;
  for (const c of containers) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byCountry[c.destinationCountry] = (byCountry[c.destinationCountry] || 0) + 1;
    totalWeight += c.totalWeight || 0;
  }
  res.json({ byStatus, byCountry, totalContainers: containers.length, totalWeight, containers });
});
