import { getAll, create, queryWhere } from '../services/firestore.service.js';

const PRODUCTS = [
  { name: 'Copper', category: 'metal', unit: 'kg' },
  { name: 'Aluminium', category: 'metal', unit: 'kg' },
  { name: 'Brass', category: 'metal', unit: 'kg' },
  { name: 'Iron', category: 'metal', unit: 'kg' },
  { name: 'Used Normal Batteries', category: 'battery', unit: 'kg' },
  { name: 'Used Solar Batteries', category: 'battery', unit: 'kg' },
];

const WAREHOUSES = [
  { id: 'wh_main', name: 'Torabora', type: 'main', location: 'Industrial Zone A', capacity: 50000 },
  { id: 'wh_secondary_1', name: 'Pk12', type: 'secondary', location: 'North District', capacity: 20000 },
  { id: 'wh_secondary_2', name: 'Jajab', type: 'secondary', location: 'South District', capacity: 20000 },
];

const DEFAULT_PRICING = {
  Copper: 8.5,
  Aluminium: 2.1,
  Brass: 4.8,
  Iron: 0.35,
  'Used Normal Batteries': 1.2,
  'Used Solar Batteries': 3.5,
};

const DEMO_USERS = [
  { email: 'admin@viaduc.com', name: 'Admin Owner', role: 'admin', warehouseId: null },
  { email: 'seller@viaduc.com', name: 'Stock Worker', role: 'seller', warehouseId: 'wh_secondary_1' },
];

export async function seedDatabase() {
  const existingProducts = await getAll('products');
  if (existingProducts.length === 0) {
    for (const p of PRODUCTS) {
      await create('products', p);
    }
    console.log('[Seed] Products created');
  }

  const existingWh = await getAll('warehouses');
  if (existingWh.length === 0) {
    for (const w of WAREHOUSES) {
      const { id, ...data } = w;
      const col = (await import('../services/firestore.service.js')).collection;
      await col('warehouses').doc(id).set({ ...data, id });
    }
    console.log('[Seed] Warehouses created');
  }

  for (const u of DEMO_USERS) {
    const found = await queryWhere('users', 'email', u.email);
    if (found.length === 0) {
      await create('users', { ...u, disabled: false });
    }
  }

  // Pricing and inventory are intentionally NOT seeded so the admin can enter
  // real pricing and real stock. Use `npm run seed` only for accounts/warehouses/products.
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  seedDatabase().then(() => process.exit(0));
}
