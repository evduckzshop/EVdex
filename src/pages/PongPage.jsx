import { useEffect, useRef, useState } from 'react'

const C = {
  bg: '#0F172A', surface: '#1E293B', border: 'rgba(255,255,255,.07)',
  text: '#F1F5F9', text3: '#475569', accent: '#2563EB', green: '#10B981', red: '#F87171',
}

const W = 358, H = 500
const PADDLE_W = 70, PADDLE_H = 10, BALL_R = 6
const PLAYER_SPEED = 8, AI_SPEED = 4.5
const INIT_BALL_SPEED = 4

export default function PongPage() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const [scores, setScores] = useState({ player: 0, ai: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState('')
  const touchX = useRef(null)

  function initState() {
    return {
      player: { x: W / 2 - PADDLE_W / 2, y: H - 30 },
      ai: { x: W / 2 - PADDLE_W / 2, y: 20 },
      ball: { x: W / 2, y: H / 2, dx: (Math.random() > 0.5 ? 1 : -1) * INIT_BALL_SPEED, dy: -INIT_BALL_SPEED },
      playerScore: 0,
      aiScore: 0,
      keys: {},
    }
  }

  function resetBall(s, direction) {
    s.ball.x = W / 2
    s.ball.y = H / 2
    const speed = INIT_BALL_SPEED
    s.ball.dx = (Math.random() > 0.5 ? 1 : -1) * speed
    s.ball.dy = direction * speed
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    stateRef.current = initState()

    function onKeyDown(e) {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
        e.preventDefault()
        stateRef.current.keys[e.key] = true
      }
    }
    function onKeyUp(e) { stateRef.current.keys[e.key] = false }

    function onTouchStart(e) {
      const rect = canvas.getBoundingClientRect()
      touchX.current = e.touches[0].clientX - rect.left
    }
    function onTouchMove(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      touchX.current = e.touches[0].clientX - rect.left
    }
    function onTouchEnd() { touchX.current = null }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    function update() {
      const s = stateRef.current
      if (!s) return

      // Player movement — keyboard
      const keys = s.keys
      if (keys['ArrowLeft'] || keys['a']) s.player.x = Math.max(0, s.player.x - PLAYER_SPEED)
      if (keys['ArrowRight'] || keys['d']) s.player.x = Math.min(W - PADDLE_W, s.player.x + PLAYER_SPEED)

      // Player movement — touch
      if (touchX.current !== null) {
        const targetX = touchX.current - PADDLE_W / 2
        const diff = targetX - s.player.x
        s.player.x += Math.sign(diff) * Math.min(Math.abs(diff), PLAYER_SPEED * 1.5)
        s.player.x = Math.max(0, Math.min(W - PADDLE_W, s.player.x))
      }

      // AI movement — medium difficulty (tracks ball with delay + slight error)
      const aiCenter = s.ai.x + PADDLE_W / 2
      const targetAi = s.ball.dy < 0 ? s.ball.x + (Math.random() - 0.5) * 30 : W / 2
      const aiDiff = targetAi - aiCenter
      if (Math.abs(aiDiff) > 5) {
        s.ai.x += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), AI_SPEED)
      }
      s.ai.x = Math.max(0, Math.min(W - PADDLE_W, s.ai.x))

      // Ball movement
      s.ball.x += s.ball.dx
      s.ball.y += s.ball.dy

      // Wall bounce (left/right)
      if (s.ball.x <= BALL_R) { s.ball.x = BALL_R; s.ball.dx = Math.abs(s.ball.dx) }
      if (s.ball.x >= W - BALL_R) { s.ball.x = W - BALL_R; s.ball.dx = -Math.abs(s.ball.dx) }

      // Paddle collision — player (bottom)
      if (
        s.ball.dy > 0 &&
        s.ball.y + BALL_R >= s.player.y &&
        s.ball.y + BALL_R <= s.player.y + PADDLE_H + 4 &&
        s.ball.x >= s.player.x - BALL_R &&
        s.ball.x <= s.player.x + PADDLE_W + BALL_R
      ) {
        s.ball.dy = -Math.abs(s.ball.dy) * 1.02
        const hitPos = (s.ball.x - (s.player.x + PADDLE_W / 2)) / (PADDLE_W / 2)
        s.ball.dx = hitPos * 5
        s.ball.y = s.player.y - BALL_R
      }

      // Paddle collision — AI (top)
      if (
        s.ball.dy < 0 &&
        s.ball.y - BALL_R <= s.ai.y + PADDLE_H &&
        s.ball.y - BALL_R >= s.ai.y - 4 &&
        s.ball.x >= s.ai.x - BALL_R &&
        s.ball.x <= s.ai.x + PADDLE_W + BALL_R
      ) {
        s.ball.dy = Math.abs(s.ball.dy) * 1.02
        const hitPos = (s.ball.x - (s.ai.x + PADDLE_W / 2)) / (PADDLE_W / 2)
        s.ball.dx = hitPos * 5
        s.ball.y = s.ai.y + PADDLE_H + BALL_R
      }

      // Score — ball passes bottom (AI scores)
      if (s.ball.y > H + 10) {
        s.aiScore++
        setScores({ player: s.playerScore, ai: s.aiScore })
        if (s.aiScore >= 5) { setGameOver(true); setWinner('AI'); return }
        resetBall(s, -1)
      }

      // Score — ball passes top (player scores)
      if (s.ball.y < -10) {
        s.playerScore++
        setScores({ player: s.playerScore, ai: s.aiScore })
        if (s.playerScore >= 5) { setGameOver(true); setWinner('You'); return }
        resetBall(s, 1)
      }
    }

    function draw() {
      const s = stateRef.current
      if (!s) return

      // Background
      ctx.fillStyle = C.bg
      ctx.fillRect(0, 0, W, H)

      // Center line
      ctx.setLineDash([6, 6])
      ctx.strokeStyle = 'rgba(255,255,255,.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // AI paddle
      ctx.fillStyle = C.red
      ctx.beginPath()
      ctx.roundRect(s.ai.x, s.ai.y, PADDLE_W, PADDLE_H, 5)
      ctx.fill()

      // Player paddle
      ctx.fillStyle = C.accent
      ctx.beginPath()
      ctx.roundRect(s.player.x, s.player.y, PADDLE_W, PADDLE_H, 5)
      ctx.fill()

      // Paddle glow
      ctx.shadowColor = C.accent
      ctx.shadowBlur = 12
      ctx.fillStyle = C.accent
      ctx.beginPath()
      ctx.roundRect(s.player.x, s.player.y, PADDLE_W, PADDLE_H, 5)
      ctx.fill()
      ctx.shadowBlur = 0

      // Pokeball
      const bx = s.ball.x, by = s.ball.y, br = BALL_R + 2
      ctx.save()
      // Outer glow
      ctx.shadowColor = '#F87171'
      ctx.shadowBlur = 10
      // Top half (red)
      ctx.fillStyle = '#DC2626'
      ctx.beginPath()
      ctx.arc(bx, by, br, Math.PI, 0)
      ctx.fill()
      ctx.shadowBlur = 0
      // Bottom half (white)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI)
      ctx.fill()
      // Center band (black)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bx - br, by)
      ctx.lineTo(bx + br, by)
      ctx.stroke()
      // Outline
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.stroke()
      // Center button (outer)
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.arc(bx, by, br * 0.38, 0, Math.PI * 2)
      ctx.fill()
      // Center button (inner)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bx, by, br * 0.22, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Scores on canvas
      ctx.font = '600 32px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,.06)'
      ctx.fillText(s.aiScore, W / 2, H / 2 - 20)
      ctx.fillText(s.playerScore, W / 2, H / 2 + 45)
    }

    function loop() {
      if (stateRef.current && !gameOver) {
        update()
        draw()
      }
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [gameOver])

  function restart() {
    setScores({ player: 0, ai: 0 })
    setGameOver(false)
    setWinner('')
    stateRef.current = initState()
  }

  return (
    <div style={{ paddingTop: 12, textAlign: 'center' }}>
      {/* Score bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: C.red, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>AI</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.red }}>{scores.ai}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,.1)', alignSelf: 'stretch' }} />
        <div>
          <div style={{ fontSize: 9, color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>You</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{scores.player}</div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', display: 'inline-block', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%', maxWidth: W, touchAction: 'none' }} />

        {/* Game over overlay */}
        {gameOver && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(15,23,42,.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: winner === 'You' ? C.green : C.red, marginBottom: 4 }}>
              {winner === 'You' ? 'You Win!' : 'AI Wins'}
            </div>
            <div style={{ fontSize: 13, color: C.text3, marginBottom: 20 }}>
              {scores.player} — {scores.ai}
            </div>
            <button onClick={restart} style={{
              padding: '11px 28px', borderRadius: 12, background: C.accent,
              border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}>
              Play again
            </button>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>
        Swipe or use arrow keys · First to 5 wins
      </div>
    </div>
  )
}
