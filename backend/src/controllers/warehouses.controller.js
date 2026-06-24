import { getAll, getById, create, update, remove } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listWarehouses = asyncHandler(async (_req, res) => {
  res.json(await getAll('warehouses'));
});

export const getWarehouse = asyncHandler(async (req, res) => {
  const wh = await getById('warehouses', req.params.id);
  if (!wh) throw new AppError('Warehouse not found', 404);
  res.json(wh);
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const wh = await create('warehouses', req.body);
  res.status(201).json(wh);
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const wh = await update('warehouses', req.params.id, req.body);
  res.json(wh);
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  await remove('warehouses', req.params.id);
  res.json({ message: 'Warehouse deleted' });
});

export const getWarehouseAnalytics = asyncHandler(async (_req, res) => {
  const warehouses = await getAll('warehouses');
  const inventory = await getAll('inventory');
  const analytics = warehouses.map((wh) => {
    const items = inventory.filter((i) => i.warehouseId === wh.id);
    const totalWeight = items.reduce((s, i) => s + (i.weight || 0), 0);
    const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalValue = items.reduce((s, i) => s + (i.value || 0), 0);
    return {
      warehouseId: wh.id,
      name: wh.name,
      type: wh.type,
      totalWeight,
      totalQuantity,
      totalValue,
      itemCount: items.length,
    };
  });
  res.json(analytics);
});
