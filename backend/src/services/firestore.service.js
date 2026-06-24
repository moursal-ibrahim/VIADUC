import { getDb } from '../config/firebase.js';
import { mockCollection } from '../utils/mockStore.js';

const COLLECTIONS = [
  'users',
  'warehouses',
  'products',
  'inventory',
  'transfers',
  'expenses',
  'salaries',
  'moneyTransfers',
  'containers',
  'reports',
  'pricing',
  'wholesalePricing',
  'entries',
  'moneySubmissions',
  'sellerFunding',
  'warehouseTransfers',
  'openingStock',
  'warehouseOpeningBalances',
];

export function collection(name) {
  const db = getDb();
  if (db) return db.collection(name);
  if (COLLECTIONS.includes(name)) return mockCollection(name);
  throw new Error(`Unknown collection: ${name}`);
}

export async function getAll(name) {
  const snap = await collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getById(name, id) {
  const doc = await collection(name).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function create(name, data) {
  const payload = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ref = await collection(name).add(payload);
  return { id: ref.id, ...payload };
}

export async function createWithId(name, id, data) {
  const payload = {
    ...data,
    id,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await collection(name).doc(id).set(payload);
  return { id, ...payload };
}

export async function update(name, id, data) {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await collection(name).doc(id).update(payload);
  return { id, ...(await getById(name, id)) };
}

export async function remove(name, id) {
  await collection(name).doc(id).delete();
  return { id };
}

export async function queryWhere(name, field, value) {
  const snap = await collection(name).where(field, '==', value).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
