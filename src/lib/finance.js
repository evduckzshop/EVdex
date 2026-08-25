// Shared money math. These rules were previously copy-pasted across
// HomePage, CashFlow, P&L, Reporting, Transactions, Show detail, Show compare
// and the export center — change them here and every screen agrees.

// Sum a numeric column across rows. Null/undefined/garbage counts as 0
// rather than poisoning the total with NaN.
export function sumBy(rows, key) {
  let total = 0
  for (const r of rows || []) total += Number(r?.[key]) || 0
  return total
}

// A trade can settle with cash on top of the swapped cards.
//   delta > 0 → the customer paid us   → counts as revenue
//   delta < 0 → we paid the customer   → counts as spend
// Trades that settle even (or with no cash) contribute nothing.
export function splitTradeCash(trades) {
  let inflow = 0, outflow = 0
  for (const t of trades || []) {
    const paid = Number(t?.amount_paid) || 0
    if (paid <= 0) continue
    if (t.delta > 0) inflow += paid
    else if (t.delta < 0) outflow += paid
  }
  return { inflow, outflow }
}

// Convenience for the common "revenue and spend, trades included" shape.
export function totalsWithTrades({ sales, buys, trades, saleKey = 'sale_price', buyKey = 'amount_paid' }) {
  const { inflow, outflow } = splitTradeCash(trades)
  return {
    revenue: sumBy(sales, saleKey) + inflow,
    spend: sumBy(buys, buyKey) + outflow,
  }
}
