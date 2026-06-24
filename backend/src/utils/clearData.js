import { pathToFileURL } from 'url';
import { initFirebase } from '../config/firebase.js';
import { getAll, remove } from '../services/firestore.service.js';

// Operational / sample data to wipe. We intentionally KEEP:
//   users      -> so you can still log in
//   warehouses -> Torabora / Pk12 / Jajab
//   products   -> the material catalog (Copper, Aluminium, ...)
const COLLECTIONS_TO_CLEAR = [
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
];

export async function clearData() {
  const { db } = initFirebase();
  const lines = [];
  lines.push(db ? '[Clear] Connected to Firebase Firestore.' : '[Clear] WARNING: no Firebase — using mock store (no real data will be deleted).');

  let total = 0;
  for (const name of COLLECTIONS_TO_CLEAR) {
    const docs = await getAll(name);
    for (const d of docs) {
      await remove(name, d.id);
    }
    total += docs.length;
    lines.push(`[Clear] ${name}: removed ${docs.length}`);
  }

  // Verify
  for (const name of COLLECTIONS_TO_CLEAR) {
    const remaining = (await getAll(name)).length;
    if (remaining > 0) lines.push(`[Clear] WARNING: ${name} still has ${remaining} doc(s)`);
  }

  lines.push(`[Clear] Done — removed ${total} document(s). Kept: users, warehouses, products.`);
  return lines;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  clearData()
    .then((lines) => {
      process.stdout.write(lines.join('\n') + '\n', () => {
        setTimeout(() => process.exit(0), 250);
      });
    })
    .catch((err) => {
      console.error('[Clear] Failed:', err);
      process.exit(1);
    });
}
