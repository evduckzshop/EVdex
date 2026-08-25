// Per-show economics — the single place show revenue/COGS/net is computed.
// Loads every selected show in one batch of four queries rather than four
// queries per show.

import { supabase } from './supabase'
import { sumBy, totalsWithTrades } from './finance'

function groupBy(rows, key) {
  const map = {}
  for (const row of rows || []) {
    const k = row[key]
    if (k) (map[k] = map[k] || []).push(row)
  }
  return map
}

// A show sits on its event date; fall back to when it was created so shows
// with no date still land somewhere sensible in a date filter.
export function showDate(show) {
  return show?.event_date
    ? new Date(`${show.event_date}T12:00:00`)
    : new Date(show?.created_at)
}

const EMPTY = {
  revenue: 0, cogs: 0, expenses: 0, fee: 0, net: 0,
  salesCount: 0, buysCount: 0, tradesCount: 0, txCount: 0, avgSale: 0,
}

// Takes show ROWS (needs table_fee), returns stats keyed by show id.
export async function fetchShowTotals(shows) {
  const list = shows || []
  if (!list.length) return {}

  const ids = list.map(s => s.id)
  const [salesRes, buysRes, expRes, tradesRes] = await Promise.all([
    supabase.from('sales').select('sale_price,show_id').in('show_id', ids).range(0, 9999),
    supabase.from('buys').select('amount_paid,show_id').in('show_id', ids).range(0, 9999),
    supabase.from('expenses').select('amount,show_id').in('show_id', ids).range(0, 9999),
    supabase.from('trades').select('delta,amount_paid,show_id').in('show_id', ids).range(0, 9999),
  ])
  for (const res of [salesRes, buysRes, expRes, tradesRes]) {
    if (res.error) throw res.error
  }

  const salesBy = groupBy(salesRes.data, 'show_id')
  const buysBy = groupBy(buysRes.data, 'show_id')
  const expBy = groupBy(expRes.data, 'show_id')
  const tradesBy = groupBy(tradesRes.data, 'show_id')

  const out = {}
  for (const show of list) {
    const sales = salesBy[show.id] || []
    const buys = buysBy[show.id] || []
    const trades = tradesBy[show.id] || []
    const { revenue, spend: cogs } = totalsWithTrades({ sales, buys, trades })
    const expenses = sumBy(expBy[show.id], 'amount')
    const fee = Number(show.table_fee) || 0

    out[show.id] = {
      id: show.id,
      name: show.name,
      location: show.location || null,
      eventDate: show.event_date || null,
      status: show.status || 'upcoming',
      revenue, cogs, expenses, fee,
      net: revenue - cogs - expenses - fee,
      salesCount: sales.length,
      buysCount: buys.length,
      tradesCount: trades.length,
      txCount: sales.length + buys.length + trades.length,
      avgSale: sales.length ? revenue / sales.length : 0,
    }
  }
  return out
}

// Roll several shows up into one set of numbers — this is how a two-day
// event (or a whole venue, or a season) gets read as a single result.
export function combineShowTotals(rows) {
  const list = (rows || []).filter(Boolean)
  if (!list.length) return { ...EMPTY, showCount: 0 }

  const acc = { ...EMPTY, showCount: list.length }
  for (const r of list) {
    acc.revenue += r.revenue
    acc.cogs += r.cogs
    acc.expenses += r.expenses
    acc.fee += r.fee
    acc.net += r.net
    acc.salesCount += r.salesCount
    acc.buysCount += r.buysCount
    acc.tradesCount += r.tradesCount
    acc.txCount += r.txCount
  }
  acc.avgSale = acc.salesCount ? acc.revenue / acc.salesCount : 0
  return acc
}

// The lanes the stats page ranks and charts by.
export const METRICS = [
  { key: 'net',      label: 'Net profit',   get: d => d.net,      format: v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString()}`, signed: true },
  { key: 'revenue',  label: 'Revenue',      get: d => d.revenue,  format: v => `$${Math.round(v).toLocaleString()}` },
  { key: 'txCount',  label: 'Transactions', get: d => d.txCount,  format: v => String(v) },
  { key: 'avgSale',  label: 'Avg sale',     get: d => d.avgSale,  format: v => `$${v.toFixed(2)}` },
]
