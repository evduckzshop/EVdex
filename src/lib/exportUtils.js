import { supabase } from './supabase'

// ── Date range helpers ──────────────────────────────────────────

export function getDateRange(preset, customStart, customEnd) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()

  switch (preset) {
    case 'this_month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) }
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3
      return { start: new Date(y, qStart, 1), end: new Date(y, qStart + 3, 0, 23, 59, 59) }
    }
    case 'this_year':
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) }
    case 'last_year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59) }
    case 'custom':
      return {
        start: customStart ? new Date(customStart + 'T00:00:00') : new Date(y, 0, 1),
        end: customEnd ? new Date(customEnd + 'T23:59:59') : now,
      }
    default:
      return { start: new Date(y, 0, 1), end: now }
  }
}

export function formatDateRange(preset, start, end) {
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const labels = {
    this_month: 'This Month',
    last_month: 'Last Month',
    this_quarter: 'This Quarter',
    this_year: 'This Year',
    last_year: 'Last Year',
  }
  if (labels[preset]) return labels[preset]
  return `${fmt(start)} – ${fmt(end)}`
}

// ── Formatting ──────────────────────────────────────────────────

export const fmtCurrency = v => {
  const n = Number(v)
  if (isNaN(n) || v == null) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const fmtDate = iso => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

// ── Data fetching ───────────────────────────────────────────────

async function queryWithRange(table, select, start, end, dateCol = 'created_at') {
  let q = supabase.from(table).select(select)
    .gte(dateCol, start.toISOString())
    .lte(dateCol, end.toISOString())
    .order(dateCol, { ascending: false })
    .range(0, 9999)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Lookup maps for resolving foreign keys
async function loadLookups() {
  const [shows, contacts, profiles] = await Promise.all([
    supabase.from('shows').select('id,name,event_date,location,table_fee').range(0, 9999),
    supabase.from('contacts').select('id,name').range(0, 9999),
    supabase.from('profiles').select('id,full_name').range(0, 9999),
  ])
  const showMap = Object.fromEntries((shows.data || []).map(s => [s.id, s]))
  const contactMap = Object.fromEntries((contacts.data || []).map(c => [c.id, c.name]))
  const profileMap = Object.fromEntries((profiles.data || []).map(p => [p.id, p.full_name]))
  return { showMap, contactMap, profileMap }
}

export async function fetchIncomeReport(start, end) {
  const [rows, { showMap, contactMap, profileMap }] = await Promise.all([
    queryWithRange('sales', '*', start, end),
    loadLookups(),
  ])
  return rows.map(r => ({
    Date: fmtDate(r.created_at),
    Description: r.description || '',
    Type: r.sale_type || '',
    'Sale Price': fmtCurrency(r.sale_price),
    'Cost Basis': r.cost_basis ? fmtCurrency(r.cost_basis) : '',
    Payment: r.payment || '',
    Buyer: contactMap[r.buyer_contact_id] || r.buyer || '',
    Show: showMap[r.show_id]?.name || '',
    'Logged By': profileMap[r.created_by] || '',
    _sale_price: Number(r.sale_price) || 0,
    _cost_basis: Number(r.cost_basis) || 0,
  }))
}

export async function fetchPurchaseReport(start, end) {
  const [rows, { showMap, contactMap, profileMap }] = await Promise.all([
    queryWithRange('buys', '*', start, end),
    loadLookups(),
  ])
  return rows.map(r => ({
    Date: fmtDate(r.created_at),
    Description: r.description || '',
    Type: r.buy_type || '',
    Qty: r.qty ?? '',
    Condition: r.condition || '',
    'Amount Paid': fmtCurrency(r.amount_paid),
    'Market Value': r.market_value ? fmtCurrency(r.market_value) : '',
    '% of Market': r.pct_of_market ? `${r.pct_of_market}%` : '',
    Source: contactMap[r.source_contact_id] || r.source || '',
    Payment: r.payment || '',
    Show: showMap[r.show_id]?.name || '',
    Notes: r.notes || '',
    'Logged By': profileMap[r.created_by] || '',
    _amount_paid: Number(r.amount_paid) || 0,
  }))
}

export async function fetchExpenseReport(start, end) {
  const [rows, { showMap, profileMap }] = await Promise.all([
    queryWithRange('expenses', '*', start, end),
    loadLookups(),
  ])
  return rows.map(r => ({
    Date: fmtDate(r.created_at),
    Description: r.description || '',
    Category: r.category || '',
    Amount: fmtCurrency(r.amount),
    Payment: r.payment || '',
    Show: showMap[r.show_id]?.name || '',
    'Logged By': profileMap[r.created_by] || '',
    _amount: Number(r.amount) || 0,
    _category: r.category || 'Other',
  }))
}

export async function fetchInventoryReport() {
  const { data, error } = await supabase.from('inventory').select('*')
    .order('name', { ascending: true }).range(0, 9999)
  if (error) throw error
  return (data || []).map(r => ({
    Name: r.name || '',
    Type: r.item_type || '',
    Qty: r.qty ?? 1,
    Condition: r.condition || '',
    'Cost Basis': r.cost_basis ? fmtCurrency(r.cost_basis) : '',
    'Listed Price': r.listed_price ? fmtCurrency(r.listed_price) : '',
    'Total Cost': r.cost_basis ? fmtCurrency(Number(r.cost_basis) * (r.qty || 1)) : '',
    'Total Listed': r.listed_price ? fmtCurrency(Number(r.listed_price) * (r.qty || 1)) : '',
    Notes: r.notes || '',
    _cost: (Number(r.cost_basis) || 0) * (r.qty || 1),
    _listed: (Number(r.listed_price) || 0) * (r.qty || 1),
    _qty: r.qty || 1,
  }))
}

export async function fetchShowPLReport(start, end) {
  const { showMap, profileMap } = await loadLookups()

  // Get shows in date range (by event_date if available, or created_at)
  let showQ = supabase.from('shows').select('*').range(0, 9999)
  const { data: allShows, error: showErr } = await showQ
  if (showErr) throw showErr

  // Filter shows by date range
  const shows = (allShows || []).filter(s => {
    const d = s.event_date ? new Date(s.event_date + 'T00:00:00') : new Date(s.created_at)
    return d >= start && d <= end
  })

  if (!shows.length) return []

  const showIds = shows.map(s => s.id)

  // Fetch all sales, buys, expenses linked to these shows
  const [salesRes, buysRes, expRes] = await Promise.all([
    supabase.from('sales').select('sale_price,show_id').in('show_id', showIds).range(0, 9999),
    supabase.from('buys').select('amount_paid,show_id').in('show_id', showIds).range(0, 9999),
    supabase.from('expenses').select('amount,show_id').in('show_id', showIds).range(0, 9999),
  ])

  // Group by show
  const salesByShow = groupBy(salesRes.data || [], 'show_id')
  const buysByShow = groupBy(buysRes.data || [], 'show_id')
  const expByShow = groupBy(expRes.data || [], 'show_id')

  return shows.map(s => {
    const rev = (salesByShow[s.id] || []).reduce((sum, r) => sum + Number(r.sale_price), 0)
    const cogs = (buysByShow[s.id] || []).reduce((sum, r) => sum + Number(r.amount_paid), 0)
    const exp = (expByShow[s.id] || []).reduce((sum, r) => sum + Number(r.amount), 0)
    const fee = Number(s.table_fee) || 0
    const net = rev - cogs - exp - fee
    return {
      Show: s.name,
      Date: s.event_date ? fmtDate(s.event_date + 'T00:00:00') : '',
      Location: s.location || '',
      Status: s.status || '',
      Revenue: fmtCurrency(rev),
      'Cost of Goods': fmtCurrency(cogs),
      'Table Fee': fmtCurrency(fee),
      Expenses: fmtCurrency(exp),
      'Net Profit': fmtCurrency(net),
      'Sales Count': (salesByShow[s.id] || []).length,
      'Buys Count': (buysByShow[s.id] || []).length,
      _revenue: rev,
      _cogs: cogs,
      _fee: fee,
      _expenses: exp,
      _net: net,
    }
  }).sort((a, b) => b._net - a._net)
}

function groupBy(arr, key) {
  const map = {}
  for (const item of arr) {
    const k = item[key]
    if (k) (map[k] = map[k] || []).push(item)
  }
  return map
}

// ── Summary computations ────────────────────────────────────────

export function computeSummary(rows, reportType) {
  if (!rows.length) return null

  switch (reportType) {
    case 'income': {
      const totalSales = rows.reduce((s, r) => s + r._sale_price, 0)
      const totalCost = rows.reduce((s, r) => s + r._cost_basis, 0)
      return {
        lines: [
          { label: 'Total Sales Revenue', value: fmtCurrency(totalSales) },
          { label: 'Total Cost Basis', value: fmtCurrency(totalCost) },
          { label: 'Total Transactions', value: String(rows.length) },
        ],
      }
    }
    case 'purchases': {
      const total = rows.reduce((s, r) => s + r._amount_paid, 0)
      return {
        lines: [
          { label: 'Total Purchases', value: fmtCurrency(total) },
          { label: 'Total Transactions', value: String(rows.length) },
        ],
      }
    }
    case 'expenses': {
      const total = rows.reduce((s, r) => s + r._amount, 0)
      const byCat = {}
      rows.forEach(r => { byCat[r._category] = (byCat[r._category] || 0) + r._amount })
      const catLines = Object.entries(byCat).sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => ({ label: `  ${cat}`, value: fmtCurrency(amt) }))
      return {
        lines: [
          ...catLines,
          { label: 'Total Expenses', value: fmtCurrency(total) },
        ],
      }
    }
    case 'inventory': {
      const totalCost = rows.reduce((s, r) => s + r._cost, 0)
      const totalListed = rows.reduce((s, r) => s + r._listed, 0)
      const totalQty = rows.reduce((s, r) => s + r._qty, 0)
      return {
        lines: [
          { label: 'Total Items', value: String(totalQty) },
          { label: 'Total Cost Basis', value: fmtCurrency(totalCost) },
          { label: 'Total Listed Value', value: fmtCurrency(totalListed) },
          { label: 'Potential Profit', value: fmtCurrency(totalListed - totalCost) },
        ],
      }
    }
    case 'show_pl': {
      const totalRev = rows.reduce((s, r) => s + r._revenue, 0)
      const totalCogs = rows.reduce((s, r) => s + r._cogs, 0)
      const totalFees = rows.reduce((s, r) => s + r._fee, 0)
      const totalExp = rows.reduce((s, r) => s + r._expenses, 0)
      const totalNet = rows.reduce((s, r) => s + r._net, 0)
      return {
        lines: [
          { label: 'Total Revenue', value: fmtCurrency(totalRev) },
          { label: 'Total COGS', value: fmtCurrency(totalCogs) },
          { label: 'Total Table Fees', value: fmtCurrency(totalFees) },
          { label: 'Total Expenses', value: fmtCurrency(totalExp) },
          { label: 'Total Net Profit', value: fmtCurrency(totalNet) },
          { label: 'Shows Attended', value: String(rows.length) },
        ],
      }
    }
    default:
      return null
  }
}

// ── CSV generation ──────────────────────────────────────────────

export function generateCSV(rows, reportTitle, dateLabel, summary) {
  if (!rows.length) return null

  // Get visible columns (exclude underscore-prefixed internal fields)
  const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'))
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`

  let csv = `${reportTitle}\n${dateLabel}\nGenerated: ${fmtDate(new Date().toISOString())}\n\n`
  csv += headers.map(escape).join(',') + '\n'
  csv += rows.map(r => headers.map(h => escape(r[h])).join(',')).join('\n')

  if (summary) {
    csv += '\n\n--- SUMMARY ---\n'
    summary.lines.forEach(l => {
      csv += `${escape(l.label)},${escape(l.value)}\n`
    })
  }

  return csv
}

export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF generation ──────────────────────────────────────────────

export async function generatePDF(rows, reportTitle, dateLabel, summary) {
  if (!rows.length) return null

  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.text(reportTitle, 14, 18)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`${dateLabel}  |  Generated: ${fmtDate(new Date().toISOString())}  |  EVduckzShop LLC`, 14, 25)

  // Table
  const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'))
  const body = rows.map(r => headers.map(h => String(r[h] ?? '')))

  doc.autoTable({
    head: [headers],
    body,
    startY: 32,
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer with page numbers
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageW - 30, doc.internal.pageSize.getHeight() - 10)
    },
  })

  // Summary section
  if (summary) {
    const finalY = doc.lastAutoTable.finalY || 40
    let y = finalY + 10

    // Check if we need a new page
    if (y + summary.lines.length * 6 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text('Summary', 14, y)
    y += 7

    doc.setFontSize(9)
    summary.lines.forEach(line => {
      const isBold = !line.label.startsWith('  ')
      if (isBold) {
        doc.setFont(undefined, 'bold')
        doc.setTextColor(30, 41, 59)
      } else {
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 116, 139)
      }
      doc.text(line.label.trim(), 14, y)
      doc.text(line.value, 80, y)
      y += 5.5
    })
  }

  return doc
}
