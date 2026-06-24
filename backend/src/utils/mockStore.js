/** In-memory fallback when Firebase is not configured (local dev). */
const store = {
  users: new Map(),
  warehouses: new Map(),
  products: new Map(),
  inventory: new Map(),
  transfers: new Map(),
  expenses: new Map(),
  salaries: new Map(),
  moneyTransfers: new Map(),
  containers: new Map(),
  reports: new Map(),
  pricing: new Map(),
  wholesalePricing: new Map(),
  entries: new Map(),
  moneySubmissions: new Map(),
  sellerFunding: new Map(),
  warehouseTransfers: new Map(),
  openingStock: new Map(),
  warehouseOpeningBalances: new Map(),
};

let idCounter = 1;
export const genId = () => `mock_${Date.now()}_${idCounter++}`;

export function mockCollection(name) {
  const col = store[name];
  if (!col) throw new Error(`Unknown collection: ${name}`);

  return {
    doc(id) {
      const data = col.get(id);
      return {
        async get() {
          const current = col.get(id);
          return {
            exists: !!current,
            id,
            data: () => (current ? { ...current } : undefined),
          };
        },
        async set(obj, opts) {
          const existing = col.get(id);
          const merged = opts?.merge && existing ? { ...existing, ...obj } : { ...obj };
          col.set(id, { ...merged, id });
        },
        async update(obj) {
          const cur = col.get(id) || { id };
          col.set(id, { ...cur, ...obj, id });
        },
        async delete() {
          col.delete(id);
        },
      };
    },
    async add(obj) {
      const id = genId();
      col.set(id, { ...obj, id, createdAt: obj.createdAt || new Date().toISOString() });
      return { id };
    },
    where(field, op, value) {
      const filters = [{ field, op, value }];
      const chain = {
        where(f, o, v) {
          filters.push({ field: f, op: o, value: v });
          return chain;
        },
        orderBy(field, dir = 'asc') {
          chain._order = { field, dir };
          return chain;
        },
        limit(n) {
          chain._limit = n;
          return chain;
        },
        async get() {
          let items = [...col.values()];
          for (const f of filters) {
            items = items.filter((item) => {
              const v = item[f.field];
              if (f.op === '==') return v === f.value;
              if (f.op === 'array-contains') return Array.isArray(v) && v.includes(f.value);
              return true;
            });
          }
          if (chain._order) {
            const { field, dir } = chain._order;
            items.sort((a, b) => {
              const av = a[field];
              const bv = b[field];
              if (av < bv) return dir === 'asc' ? -1 : 1;
              if (av > bv) return dir === 'asc' ? 1 : -1;
              return 0;
            });
          }
          if (chain._limit) items = items.slice(0, chain._limit);
          return {
            docs: items.map((data) => ({
              id: data.id,
              data: () => ({ ...data }),
            })),
            empty: items.length === 0,
          };
        },
      };
      return chain;
    },
    async get() {
      const items = [...col.values()];
      return {
        docs: items.map((data) => ({
          id: data.id,
          data: () => ({ ...data }),
        })),
        empty: items.length === 0,
      };
    },
  };
}

export function getMockStore() {
  return store;
}
