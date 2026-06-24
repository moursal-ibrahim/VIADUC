import { getAll, create, remove } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const OPENING_STOCK_LABEL = 'Stock initial saisi manuellement';

export const getOpeningStatus = asyncHandler(async (_req, res) => {
  const stock = await getAll('openingStock');
  const balances = await getAll('warehouseOpeningBalances');
  const openingDate = stock[0]?.openingDate || balances[0]?.openingDate || null;
  res.json({
    configured: stock.length > 0 || balances.length > 0,
    openingDate,
    label: OPENING_STOCK_LABEL,
    stockLines: stock.length,
    stock,
    balances,
  });
});

export const listOpeningStock = asyncHandler(async (_req, res) => {
  res.json({
    label: OPENING_STOCK_LABEL,
    stock: await getAll('openingStock'),
    balances: await getAll('warehouseOpeningBalances'),
  });
});

/**
 * Save official opening snapshot: real quantities + real cash balances.
 * No purchase entries, no invented prices (inventory value = 0).
 */
export const saveOpeningSnapshot = asyncHandler(async (req, res) => {
  const { openingDate, warehouses: whData } = req.body;
  if (!openingDate || !Array.isArray(whData) || whData.length === 0) {
    throw new AppError('Opening date and warehouse data are required', 400);
  }

  const products = await getAll('products');
  const warehouses = await getAll('warehouses');
  const snapshotAt = new Date(openingDate).toISOString();

  const existingStock = await getAll('openingStock');
  const existingBalances = await getAll('warehouseOpeningBalances');
  const existingOpeningInventory = (await getAll('inventory')).filter((i) => i.isOpeningStock);

  for (const s of existingStock) await remove('openingStock', s.id);
  for (const b of existingBalances) await remove('warehouseOpeningBalances', b.id);
  for (const i of existingOpeningInventory) await remove('inventory', i.id);

  const created = { stock: [], balances: [], inventory: [] };

  for (const whBlock of whData) {
    const wh = warehouses.find((w) => w.id === whBlock.warehouseId);
    if (!wh) throw new AppError(`Warehouse not found: ${whBlock.warehouseId}`, 404);

    const balanceRec = await create('warehouseOpeningBalances', {
      warehouseId: wh.id,
      warehouseName: wh.name,
      cashBalance: Number(whBlock.cashBalance) || 0,
      openingDate: snapshotAt,
      isOpeningStock: true,
      label: OPENING_STOCK_LABEL,
      createdBy: req.user.uid,
      createdByName: req.user.name,
    });
    created.balances.push(balanceRec);

    for (const line of whBlock.stock || []) {
      if (!line.productId) continue;
      const weight = Number(line.weight) || 0;
      const quantity = Number(line.quantity) || 0;
      if (weight <= 0 && quantity <= 0) continue;

      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;

      const stockRec = await create('openingStock', {
        warehouseId: wh.id,
        warehouseName: wh.name,
        productId: product.id,
        productName: product.name,
        weight,
        quantity: quantity || 1,
        openingDate: snapshotAt,
        isOpeningStock: true,
        label: OPENING_STOCK_LABEL,
        createdBy: req.user.uid,
        createdByName: req.user.name,
      });
      created.stock.push(stockRec);

      const invRec = await create('inventory', {
        productId: product.id,
        productName: product.name,
        warehouseId: wh.id,
        warehouseName: wh.name,
        quantity: quantity || 1,
        weight,
        value: 0,
        status: 'in_stock',
        movementType: 'opening',
        isOpeningStock: true,
        openingDate: snapshotAt,
        label: OPENING_STOCK_LABEL,
        createdBy: req.user.uid,
        createdByName: req.user.name,
        createdAt: snapshotAt,
      });
      created.inventory.push(invRec);
    }
  }

  res.status(201).json({
    message: 'Opening snapshot saved',
    openingDate: snapshotAt,
    label: OPENING_STOCK_LABEL,
    ...created,
  });
});
