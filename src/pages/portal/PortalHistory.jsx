import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { C } from '../../components/layout/CustomerLayout'

export default function PortalHistory() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ spent: 0, points: 0, count: 0 })

  useEffect(() => {
    if (!user) return
    loadHistory()
  }, [user])

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('customer_transaction_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const rows = data || []
      setTransactions(rows)
      setTotals({
        spent: rows.reduce((s, r) => s + Number(r.sale_price), 0),
        points: rows.reduce((s, r) => s + Number(r.points_awarded || 0), 0),
        count: rows.length,
      })
    } catch (e) {
      console.error('History load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading...</div>

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18,
        padding: 18, marginBottom: 14, border: '1px solid rgba(37,99,235,.2)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Purchase history
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {totals.count} purchases
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          ${totals.spent.toLocaleString()} spent · {Math.floor(totals.points).toLocaleString()} points earned
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Total spent</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>${totals.spent.toLocaleString()}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Points earned</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{Math.floor(totals.points).toLocaleString()}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Purchases</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{totals.count}</div>
        </div>
      </div>

      {/* Transaction list */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        All transactions
      </div>

      {transactions.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 12, padding: 20, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3 }}>No transactions yet.</div>
        </div>
      ) : (
        transactions.map(tx => (
          <div key={tx.id} style={{
            background: C.surface, borderRadius: 12, padding: '11px 14px',
            marginBottom: 6, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.description}
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2, display: 'flex', gap: 6 }}>
                  <span>{tx.sale_type}</span>
                  {tx.show_name && <span>· {tx.show_name}</span>}
                  <span>· {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  ${Number(tx.sale_price).toFixed(2)}
                </div>
                {tx.points_awarded > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', marginTop: 1 }}>
                    +{Math.floor(tx.points_awarded)} pts
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}
