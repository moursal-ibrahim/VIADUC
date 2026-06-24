/** Warehouse cash balance including optional opening snapshot (no fake purchases). */
export function calcWarehouseCashBalance(whId, {
  openingBalances = [],
  funding = [],
  entries = [],
  expenses = [],
  submissions = [],
  warehouseTransfers = [],
  sellerIds = [],
}) {
  const openingCash =
    openingBalances.find((b) => b.warehouseId === whId)?.cashBalance || 0;
  const capitalGiven = funding
    .filter((f) => sellerIds.includes(f.sellerId))
    .reduce((a, f) => a + (f.amount || 0), 0);
  const purchases = entries
    .filter((e) => e.warehouseId === whId)
    .reduce((a, e) => a + (e.collectedMoney || 0), 0);
  const whExpenses = expenses
    .filter((e) => e.warehouseId === whId)
    .reduce((a, e) => a + (e.amount || 0), 0);
  const submitted = submissions
    .filter((m) => sellerIds.includes(m.createdBy))
    .reduce((a, m) => a + (m.amount || 0), 0);
  const transfersIn = warehouseTransfers
    .filter((t) => t.toWarehouseId === whId)
    .reduce((a, t) => a + (t.amount || 0), 0);
  const transfersOut = warehouseTransfers
    .filter((t) => t.fromWarehouseId === whId)
    .reduce((a, t) => a + (t.amount || 0), 0);

  return openingCash + capitalGiven - purchases - whExpenses - submitted + transfersIn - transfersOut;
}
