import { getAll, getById, create, update, remove } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

async function getPriceForProduct(productId) {
  const pricing = await getAll('pricing');
  const p = pricing.find((x) => x.productId === productId);
  return p?.pricePerKg || 0;
}

export const listInventory = asyncHandler(async (req, res) => {
  let items = await getAll('inventory');
  const { warehouseId, productId, status, search } = req.query;
  if (warehouseId) items = items.filter((i) => i.warehouseId === warehouseId);
  if (productId) items = items.filter((i) => i.productId === productId);
  if (status) items = items.filter((i) => i.status === status);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (i) =>
        i.productName?.toLowerCase().includes(q) ||
        i.warehouseName?.toLowerCase().includes(q)
    );
  }
  res.json(items);
});

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await getById('inventory', req.params.id);
  if (!item) throw new AppError('Inventory item not found', 404);
  res.json(item);
});

export const createInventory = asyncHandler(async (req, res) => {
  const { productId, warehouseId, quantity, weight, type } = req.body;
  const product = await getById('products', productId);
  const warehouse = await getById('warehouses', warehouseId);
  if (!product) throw new AppError('Product not found', 404);
  if (!warehouse) throw new AppError('Warehouse not found', 404);

  const pricePerKg = await getPriceForProduct(productId);
  const value = (weight || 0) * pricePerKg;

  const item = await create('inventory', {
    productId,
    productName: product.name,
    warehouseId,
    warehouseName: warehouse.name,
    quantity: quantity || 1,
    weight: weight || 0,
    value,
    status: type === 'outgoing' ? 'shipped' : 'in_stock',
    movementType: type || 'incoming',
    createdBy: req.user.uid,
    createdByName: req.user.name,
  });
  res.status(201).json(item);
});

export const updateInventory = asyncHandler(async (req, res) => {
  res.json(await update('inventory', req.params.id, req.body));
});

export const deleteInventory = asyncHandler(async (req, res) => {
  await remove('inventory', req.params.id);
  res.json({ message: 'Inventory item deleted' });
});

// Step 7 — move materials between warehouses (e.g. collection warehouse → main).
// Decrements stock at the source (oldest rows first) and adds it to the destination,
// so a warehouse can send a partial amount without corrupting either balance.
export const transferStock = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, productId, quantity, weight, date } = req.body;
  if (!fromWarehouseId || !toWarehouseId || !productId) {
    throw new AppError('Source, destination and product are required', 400);
  }
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError('Source and destination must be different', 400);
  }
  const moveWeight = Number(weight);
  if (!moveWeight || moveWeight <= 0) {
    throw new AppError('Weight must be greater than zero', 400);
  }

  const fromWh = await getById('warehouses', fromWarehouseId);
  const toWh = await getById('warehouses', toWarehouseId);
  const product = await getById('products', productId);
  if (!fromWh || !toWh) throw new AppError('Warehouse not found', 404);
  if (!product) throw new AppError('Product not found', 404);

  const inventory = await getAll('inventory');
  const sourceRows = inventory
    .filter(
      (i) =>
        i.warehouseId === fromWarehouseId &&
        i.productId === productId &&
        (i.status === 'in_stock' || i.status === undefined) &&
        (i.weight || 0) > 0
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const available = sourceRows.reduce((s, i) => s + (i.weight || 0), 0);
  if (moveWeight > available + 1e-6) {
    throw new AppError(`Not enough stock at ${fromWh.name}. Available: ${available} kg`, 400);
  }

  let remaining = moveWeight;
  let qtyMoved = 0;
  let valueMoved = 0;
  for (const row of sourceRows) {
    if (remaining <= 1e-6) break;
    const rowWeight = row.weight || 0;
    const take = Math.min(rowWeight, remaining);
    const ratio = rowWeight > 0 ? take / rowWeight : 0;
    const rowQty = Math.round((row.quantity || 0) * ratio);
    const rowVal = (row.value || 0) * ratio;
    qtyMoved += rowQty;
    valueMoved += rowVal;
    const newWeight = rowWeight - take;
    remaining -= take;
    if (newWeight <= 1e-4) {
      await remove('inventory', row.id);
    } else {
      await update('inventory', row.id, {
        weight: newWeight,
        quantity: (row.quantity || 0) - rowQty,
        value: (row.value || 0) - rowVal,
      });
    }
  }

  const qtyToMove = quantity != null && quantity !== '' ? Number(quantity) : qtyMoved;

  const destRow = inventory.find(
    (i) => i.warehouseId === toWarehouseId && i.productId === productId && i.status === 'in_stock'
  );
  if (destRow) {
    await update('inventory', destRow.id, {
      weight: (destRow.weight || 0) + moveWeight,
      quantity: (destRow.quantity || 0) + qtyToMove,
      value: (destRow.value || 0) + valueMoved,
    });
  } else {
    await create('inventory', {
      productId,
      productName: product.name,
      warehouseId: toWarehouseId,
      warehouseName: toWh.name,
      quantity: qtyToMove,
      weight: moveWeight,
      value: valueMoved,
      status: 'in_stock',
      movementType: 'incoming',
      createdBy: req.user.uid,
      createdByName: req.user.name,
    });
  }

  const transfer = await create('transfers', {
    productId,
    productName: product.name,
    fromWarehouseId,
    fromWarehouseName: fromWh.name,
    toWarehouseId,
    toWarehouseName: toWh.name,
    quantity: qtyToMove,
    weight: moveWeight,
    value: valueMoved,
    status: 'completed',
    date: date || new Date().toISOString(),
    createdBy: req.user.uid,
  });

  res.status(201).json(transfer);
});

export const listTransfers = asyncHandler(async (_req, res) => {
  res.json(await getAll('transfers'));
});

export const getLowStockAlerts = asyncHandler(async (_req, res) => {
  const inventory = await getAll('inventory');
  const alerts = inventory.filter((i) => (i.weight || 0) < 100 || (i.quantity || 0) < 5);
  res.json(alerts);
});

export const getMovementHistory = asyncHandler(async (req, res) => {
  const inventory = await getAll('inventory');
  const transfers = await getAll('transfers');
  const entries = await getAll('entries');
  const history = [
    ...inventory.map((i) => ({ ...i, recordType: 'inventory' })),
    ...transfers.map((t) => ({ ...t, recordType: 'transfer' })),
    ...entries.map((e) => ({ ...e, recordType: 'entry' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(history);
});
