import { getAll, getById, create, update, remove } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listProducts = asyncHandler(async (_req, res) => {
  res.json(await getAll('products'));
});

export const getProduct = asyncHandler(async (req, res) => {
  const p = await getById('products', req.params.id);
  if (!p) throw new AppError('Product not found', 404);
  res.json(p);
});

export const createProduct = asyncHandler(async (req, res) => {
  res.status(201).json(await create('products', req.body));
});

export const updateProduct = asyncHandler(async (req, res) => {
  res.json(await update('products', req.params.id, req.body));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await remove('products', req.params.id);
  res.json({ message: 'Product deleted' });
});

export const listPricing = asyncHandler(async (_req, res) => {
  res.json(await getAll('pricing'));
});

export const upsertPricing = asyncHandler(async (req, res) => {
  const { productId, pricePerKg, currency } = req.body;
  const all = await getAll('pricing');
  const existing = all.find((p) => p.productId === productId);
  if (existing) {
    res.json(await update('pricing', existing.id, { pricePerKg, currency }));
  } else {
    res.status(201).json(await create('pricing', { productId, pricePerKg, currency: currency || 'DJF' }));
  }
});

export const listWholesalePricing = asyncHandler(async (_req, res) => {
  res.json(await getAll('wholesalePricing'));
});

export const createWholesalePricing = asyncHandler(async (req, res) => {
  const { wholesaleName, name, pricePerKg, currency } = req.body;
  if (!wholesaleName || !name || pricePerKg === undefined || pricePerKg === null || pricePerKg === '') {
    throw new AppError('Wholesale name, material, and price are required', 400);
  }
  res.status(201).json(
    await create('wholesalePricing', {
      wholesaleName: String(wholesaleName).trim(),
      name: String(name).trim(),
      pricePerKg: Number(pricePerKg),
      currency: currency || 'DJF',
    })
  );
});

export const updateWholesalePricing = asyncHandler(async (req, res) => {
  res.json(await update('wholesalePricing', req.params.id, req.body));
});

export const deleteWholesalePricing = asyncHandler(async (req, res) => {
  await remove('wholesalePricing', req.params.id);
  res.json({ message: 'Wholesale price deleted' });
});
