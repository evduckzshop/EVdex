import { useState, useCallback } from 'react'

const C = {
  bg: '#111318', surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B', gold: '#F59E0B',
}

// ── Coin Flip ────────────────────────────────────────────────

function CoinFlip() {
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState(null) // 'heads' | 'tails'

  function flip() {
    if (flipping) return
    setFlipping(true)
    setResult(null)

    setTimeout(() => {
      const r = Math.random() < 0.5 ? 'heads' : 'tails'
      setResult(r)
      setFlipping(false)
    }, 2000)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Coin */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
        background: result === null && !flipping
          ? 'linear-gradient(135deg, #F59E0B, #D97706)'
          : result === 'heads'
            ? 'linear-gradient(135deg, #F59E0B, #B45309)'
            : result === 'tails'
              ? 'linear-gradient(135deg, #D97706, #92400E)'
              : 'linear-gradient(135deg, #F59E0B, #D97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', border: '4px solid rgba(245,158,11,.4)',
        boxShadow: '0 4px 20px rgba(245,158,11,.2)',
        animation: flipping ? 'coin-flip 0.3s ease-in-out infinite' : 'none',
        transform: flipping ? undefined : 'rotateY(0deg)',
        transition: flipping ? 'none' : 'transform 0.3s ease',
      }}>
        {flipping ? (
          <div style={{ fontSize: 28, color: '#fff', fontWeight: 700 }}>?</div>
        ) : result === 'heads' ? (
          <>
            <div style={{ fontSize: 36 }}>🦆</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginTop: 2, letterSpacing: '.1em' }}>HEADS</div>
          </>
        ) : result === 'tails' ? (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.9)', letterSpacing: '.05em', lineHeight: 1.2, textAlign: 'center' }}>
              EVduckz<br/>Shop
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginTop: 4, letterSpacing: '.1em' }}>TAILS</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36 }}>🦆</div>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginTop: 2, letterSpacing: '.1em' }}>TAP TO FLIP</div>
          </>
        )}
      </div>

      {/* Result text */}
      {result && !flipping && (
        <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, marginBottom: 12 }}>
          {result === 'heads' ? '🦆 Heads!' : 'Tails! 🏪'}
        </div>
      )}

      <button onClick={flip} disabled={flipping} style={{
        padding: '12px 32px', borderRadius: 12, border: 'none',
        background: flipping ? '#374151' : 'linear-gradient(135deg, #F59E0B, #D97706)',
        fontSize: 14, fontWeight: 600, color: '#fff',
        cursor: flipping ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}>
        {flipping ? 'Flipping...' : 'Flip Coin'}
      </button>

      <style>{`
        @keyframes coin-flip {
          0% { transform: rotateY(0deg) scale(1); }
          50% { transform: rotateY(180deg) scale(0.9); }
          100% { transform: rotateY(360deg) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ── Dice Roll ────────────────────────────────────────────────

const DICE_FACES = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
}

function DiceFace({ value, rolling, size = 56 }) {
  const dots = DICE_FACES[value] || []
  const dotSize = size * 0.16
  const pad = size * 0.18
  const gap = (size - pad * 2 - dotSize) / 2

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.18,
      background: 'linear-gradient(135deg, #1E293B, #0F172A)',
      border: '2px solid rgba(255,255,255,.1)',
      boxShadow: '0 2px 8px rgba(0,0,0,.3)',
      position: 'relative',
      animation: rolling ? 'dice-shake 0.15s ease infinite' : 'none',
    }}>
      {rolling ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, color: C.text3, fontWeight: 700 }}>
          ?
        </div>
      ) : (
        dots.map(([r, c], i) => (
          <div key={i} style={{
            position: 'absolute',
            top: pad + r * gap,
            left: pad + c * gap,
            width: dotSize, height: dotSize, borderRadius: '50%',
            background: C.text,
            boxShadow: '0 0 4px rgba(255,255,255,.2)',
          }} />
        ))
      )}
    </div>
  )
}

function DiceRoll() {
  const [diceCount, setDiceCount] = useState(2)
  const [rolling, setRolling] = useState(false)
  const [results, setResults] = useState([])

  function roll() {
    if (rolling) return
    setRolling(true)
    setResults([])

    setTimeout(() => {
      const r = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1)
      setResults(r)
      setRolling(false)
    }, 2000)
  }

  const total = results.reduce((s, v) => s + v, 0)

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Dice count selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>Dice:</div>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => { setDiceCount(n); setResults([]) }} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: diceCount === n ? 'rgba(37,99,235,.2)' : C.surface,
            color: diceCount === n ? C.accent2 : C.text3,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            borderWidth: 1, borderStyle: 'solid',
            borderColor: diceCount === n ? 'rgba(37,99,235,.4)' : C.border2,
          }}>
            {n}
          </button>
        ))}
      </div>

      {/* Dice display */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, flexWrap: 'wrap', marginBottom: 16, minHeight: 70,
      }}>
        {rolling ? (
          Array.from({ length: diceCount }, (_, i) => (
            <DiceFace key={i} value={1} rolling size={diceCount > 3 ? 48 : 56} />
          ))
        ) : results.length > 0 ? (
          results.map((v, i) => (
            <DiceFace key={i} value={v} rolling={false} size={diceCount > 3 ? 48 : 56} />
          ))
        ) : (
          Array.from({ length: diceCount }, (_, i) => (
            <DiceFace key={i} value={i % 6 + 1} rolling={false} size={diceCount > 3 ? 48 : 56} />
          ))
        )}
      </div>

      {/* Result */}
      {results.length > 0 && !rolling && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.accent2 }}>
            {total}
          </div>
          {results.length > 1 && (
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
              {results.join(' + ')} = {total}
            </div>
          )}
        </div>
      )}

      <button onClick={roll} disabled={rolling} style={{
        padding: '12px 32px', borderRadius: 12, border: 'none',
        background: rolling ? '#374151' : C.accent,
        fontSize: 14, fontWeight: 600, color: '#fff',
        cursor: rolling ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}>
        {rolling ? 'Rolling...' : `Roll ${diceCount > 1 ? `${diceCount} Dice` : 'Die'}`}
      </button>

      <style>{`
        @keyframes dice-shake {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-3px, 2px) rotate(-5deg); }
          50% { transform: translate(3px, -2px) rotate(5deg); }
          75% { transform: translate(-2px, -3px) rotate(-3deg); }
          100% { transform: translate(2px, 3px) rotate(3deg); }
        }
      `}</style>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function GamblePage() {
  const [game, setGame] = useState('coin')

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 14, border: '1px solid rgba(245,158,11,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Game room
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>
          Gamble
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          Flip coins and roll dice for fun
        </div>
      </div>

      {/* Game selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'coin', label: 'Coin Flip', icon: '🪙' },
          { key: 'dice', label: 'Dice Roll', icon: '🎲' },
        ].map(g => (
          <button key={g.key} onClick={() => setGame(g.key)} style={{
            flex: 1, padding: '14px 12px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${game === g.key ? 'rgba(245,158,11,.4)' : C.border2}`,
            background: game === g.key ? 'rgba(245,158,11,.1)' : C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>{g.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: game === g.key ? C.gold : C.text2 }}>{g.label}</span>
          </button>
        ))}
      </div>

      {/* Game area */}
      <div style={{
        background: C.surface, borderRadius: 18, padding: '24px 16px',
        border: `1px solid ${C.border}`, minHeight: 200,
      }}>
        {game === 'coin' ? <CoinFlip /> : <DiceRoll />}
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
