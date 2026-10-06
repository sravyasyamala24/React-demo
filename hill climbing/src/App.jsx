import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const TAU = Math.PI * 2
const socket = io({ autoConnect: false })

function terrainY(worldX, height) {
  const scale = Math.min(1.12, Math.max(0.72, height / 500))
  return height * 0.67 + scale * (
    Math.sin(worldX / 310) * 73 +
    Math.sin(worldX / 147 + 1.4) * 35 +
    Math.sin(worldX / 82 + 0.7) * 15
  )
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawCoin(context, x, y, time) {
  const shimmer = 0.82 + Math.sin(time / 160 + x) * 0.12
  context.save()
  context.translate(x, y)
  context.scale(shimmer, 1)
  context.fillStyle = '#f5b638'
  context.beginPath()
  context.arc(0, 0, 11, 0, TAU)
  context.fill()
  context.strokeStyle = '#fff0b1'
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = '#fff0b1'
  context.font = '700 12px Trebuchet MS'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('$', 0, 0.5)
  context.restore()
}

function drawFuel(context, x, y) {
  context.save()
  context.translate(x, y)
  context.fillStyle = '#eef4df'
  roundedRect(context, -10, -14, 20, 28, 5)
  context.fill()
  context.fillStyle = '#ed7552'
  roundedRect(context, -6, -6, 12, 12, 2)
  context.fill()
  context.fillStyle = '#eef4df'
  context.fillRect(-4, -18, 8, 5)
  context.restore()
}

function drawCar(context, x, y, angle, wheelSpin, crashed) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)

  context.fillStyle = 'rgba(29, 49, 42, 0.16)'
  context.beginPath()
  context.ellipse(0, 24, 45, 7, 0, 0, TAU)
  context.fill()

  for (const wheelX of [-27, 27]) {
    context.save()
    context.translate(wheelX, 12)
    context.rotate(wheelSpin)
    context.fillStyle = '#27312e'
    context.beginPath()
    context.arc(0, 0, 12, 0, TAU)
    context.fill()
    context.strokeStyle = '#d9ddd0'
    context.lineWidth = 3
    context.beginPath()
    context.arc(0, 0, 6, 0, TAU)
    context.stroke()
    context.restore()
  }

  context.fillStyle = crashed ? '#d66e50' : '#e66f4d'
  context.beginPath()
  context.moveTo(-40, 3)
  context.lineTo(-35, -10)
  context.lineTo(-20, -15)
  context.lineTo(-11, -29)
  context.lineTo(16, -29)
  context.lineTo(30, -14)
  context.lineTo(38, -12)
  context.lineTo(42, 4)
  context.closePath()
  context.fill()
  context.fillStyle = '#f4eed8'
  context.beginPath()
  context.moveTo(-8, -25)
  context.lineTo(13, -25)
  context.lineTo(23, -15)
  context.lineTo(-15, -15)
  context.closePath()
  context.fill()
  context.fillStyle = '#f7d56b'
  roundedRect(context, 31, -8, 8, 6, 2)
  context.fill()
  context.fillStyle = '#fff4dc'
  context.font = '800 9px Trebuchet MS'
  context.textAlign = 'center'
  context.fillText('OVR', 2, -3)
  context.restore()
}

function drawLandscape(context, width, height, cameraX, time) {
  const sky = context.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#c8ddd6')
  sky.addColorStop(0.62, '#e6e3cc')
  sky.addColorStop(1, '#f0dfb3')
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#f4c86c'
  context.beginPath()
  context.arc(width * 0.78, height * 0.2, 42, 0, TAU)
  context.fill()
  context.fillStyle = 'rgba(255, 248, 218, 0.35)'
  context.beginPath()
  context.arc(width * 0.78, height * 0.2, 59, 0, TAU)
  context.fill()

  for (let layer = 0; layer < 2; layer += 1) {
    const parallax = cameraX * (layer === 0 ? 0.13 : 0.24)
    const baseline = height * (layer === 0 ? 0.64 : 0.72)
    context.fillStyle = layer === 0 ? '#a9c6b6' : '#7f9f82'
    context.beginPath()
    context.moveTo(0, height)
    context.lineTo(0, baseline)
    for (let screenX = -30; screenX <= width + 40; screenX += 8) {
      const worldX = screenX + parallax
      const ridge = Math.sin(worldX / (layer === 0 ? 180 : 245)) * 30 +
        Math.sin(worldX / 91 + 1.6) * 16
      context.lineTo(screenX, baseline + ridge)
    }
    context.lineTo(width, height)
    context.closePath()
    context.fill()
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.48)'
  for (let cloudIndex = 0; cloudIndex < 4; cloudIndex += 1) {
    const cloudX = ((cloudIndex * 271 + time * 0.008) % (width + 170)) - 85
    const cloudY = height * (0.14 + (cloudIndex % 3) * 0.09)
    context.beginPath()
    context.ellipse(cloudX, cloudY, 36, 8, 0, 0, TAU)
    context.ellipse(cloudX - 19, cloudY + 2, 17, 7, 0, 0, TAU)
    context.ellipse(cloudX + 16, cloudY + 1, 22, 8, 0, 0, TAU)
    context.fill()
  }
}

function drawWorld(context, width, height, game, time) {
  const startWorldX = game.cameraX - 60
  const endWorldX = game.cameraX + width + 60
  const step = 7

  context.beginPath()
  context.moveTo(0, height)
  for (let worldX = startWorldX; worldX <= endWorldX; worldX += step) {
    context.lineTo(worldX - game.cameraX, terrainY(worldX, height))
  }
  context.lineTo(width, height)
  context.closePath()
  const earth = context.createLinearGradient(0, height * 0.55, 0, height)
  earth.addColorStop(0, '#63856c')
  earth.addColorStop(1, '#365c4d')
  context.fillStyle = earth
  context.fill()
  context.strokeStyle = '#385e4d'
  context.lineWidth = 5
  context.stroke()

  context.strokeStyle = '#bad18b'
  context.lineWidth = 2
  context.beginPath()
  for (let worldX = startWorldX; worldX <= endWorldX; worldX += step) {
    const screenX = worldX - game.cameraX
    const surfaceY = terrainY(worldX, height)
    if (worldX === startWorldX) context.moveTo(screenX, surfaceY)
    else context.lineTo(screenX, surfaceY)
  }
  context.stroke()

  const firstCoin = Math.max(0, Math.floor((startWorldX - 180) / 360))
  const lastCoin = Math.ceil((endWorldX - 180) / 360)
  for (let index = firstCoin; index <= lastCoin; index += 1) {
    const coinX = 180 + index * 360
    if (!game.coinsCollected.has(index)) {
      drawCoin(context, coinX - game.cameraX, terrainY(coinX, height) - 67, time)
    }
  }

  const firstFuel = Math.max(0, Math.floor((startWorldX - 2050) / 3000))
  const lastFuel = Math.ceil((endWorldX - 2050) / 3000)
  for (let index = firstFuel; index <= lastFuel; index += 1) {
    const fuelX = 2050 + index * 3000
    if (!game.fuelCollected.has(index)) {
      drawFuel(context, fuelX - game.cameraX, terrainY(fuelX, height) - 67)
    }
  }

  const carScreenX = Math.max(100, Math.min(width * 0.34, width - 105))
  const surfaceY = terrainY(game.worldX, height)
  const slope = Math.atan2(
    terrainY(game.worldX + 30, height) - terrainY(game.worldX - 30, height),
    60,
  )
  drawCar(context, carScreenX, surfaceY - 25, game.mode === 'wrecked' ? game.crashAngle : slope, game.wheelSpin, game.mode === 'wrecked')
  return { carScreenX, surfaceY, slope }
}

function App() {
  const canvasRef = useRef(null)
  const keysRef = useRef({ gas: false, brake: false })
  const gameRef = useRef({
    mode: 'playing',
    worldX: 80,
    speed: 0,
    fuel: 100,
    coins: 0,
    best: Number(localStorage.getItem('overland-best') || 0),
    cameraX: 0,
    wheelSpin: 0,
    crashAngle: 0,
    scoreSubmitted: false,
    coinsCollected: new Set(),
    fuelCollected: new Set(),
  })
  const raceRef = useRef(null)
  const [mode, setMode] = useState('playing')
  const [stats, setStats] = useState({ distance: 0, best: gameRef.current.best, coins: 0, fuel: 100, speed: 0 })
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('overland-player') || 'Trailblazer')
  const [nameDraft, setNameDraft] = useState(() => localStorage.getItem('overland-player') || 'Trailblazer')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [race, setRace] = useState(null)
  const [panel, setPanel] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [serverConnected, setServerConnected] = useState(false)
  const [notice, setNotice] = useState('')

  function applyRoom(nextRoom) {
    raceRef.current = nextRoom
    setRace(nextRoom)
  }

  async function refreshLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) throw new Error('Leaderboard is unavailable.')
      setLeaderboard(await response.json())
    } catch {
      setNotice('Could not load the leaderboard. Check that the game server is running.')
    }
  }

  function rememberName() {
    const cleanedName = nameDraft.trim().slice(0, 18)
    if (!cleanedName) {
      setNotice('Add a driver name to continue.')
      return ''
    }
    localStorage.setItem('overland-player', cleanedName)
    setPlayerName(cleanedName)
    setNameDraft(cleanedName)
    setNotice('')
    return cleanedName
  }

  function createRace() {
    const name = rememberName()
    if (!name) return
    if (!socket.connected) {
      setNotice('Connecting to the race server. Try again in a moment.')
      return
    }
    socket.emit('race:create', { name }, (result) => {
      if (result?.error) return setNotice(result.error)
      applyRoom(result.room)
      setPanel('race')
    })
  }

  function joinRace() {
    const name = rememberName()
    if (!name) return
    if (!socket.connected) {
      setNotice('Connecting to the race server. Try again in a moment.')
      return
    }
    socket.emit('race:join', { name, code: roomCodeInput }, (result) => {
      if (result?.error) return setNotice(result.error)
      applyRoom(result.room)
      setPanel('race')
    })
  }

  function startRace() {
    socket.emit('race:start', (result) => {
      if (result?.error) setNotice(result.error)
    })
  }

  function leaveRace() {
    socket.emit('race:leave')
    applyRoom(null)
  }

  function changeMode(nextMode) {
    gameRef.current.mode = nextMode
    setMode(nextMode)
  }

  function restart() {
    const game = gameRef.current
    if (raceRef.current?.status === 'racing') {
      socket.emit('race:leave')
      applyRoom(null)
    }
    game.mode = 'playing'
    game.worldX = 80
    game.speed = 0
    game.fuel = 100
    game.coins = 0
    game.cameraX = 0
    game.wheelSpin = 0
    game.crashAngle = 0
    game.scoreSubmitted = false
    game.coinsCollected.clear()
    game.fuelCollected.clear()
    keysRef.current = { gas: false, brake: false }
    setStats({ distance: 0, best: game.best, coins: 0, fuel: 100, speed: 0 })
    setMode('playing')
  }

  function togglePause() {
    const game = gameRef.current
    if (game.mode === 'playing') changeMode('paused')
    else if (game.mode === 'paused') changeMode('playing')
  }

  useEffect(() => {
    function onConnect() {
      setServerConnected(true)
      setNotice('')
    }
    function onDisconnect() {
      setServerConnected(false)
      if (raceRef.current) setNotice('Connection lost. Your current run can continue offline.')
    }
    function onRoomState(room) {
      applyRoom(room)
    }
    function onRaceStart(room) {
      applyRoom(room)
      const game = gameRef.current
      game.mode = 'playing'
      game.worldX = 80
      game.speed = 0
      game.fuel = 100
      game.coins = 0
      game.cameraX = 0
      game.wheelSpin = 0
      game.crashAngle = 0
      game.scoreSubmitted = false
      game.coinsCollected.clear()
      game.fuelCollected.clear()
      keysRef.current = { gas: false, brake: false }
      setStats({ distance: 0, best: game.best, coins: 0, fuel: 100, speed: 0 })
      setMode('playing')
      setPanel(null)
      setNotice('')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('race:state', onRoomState)
    socket.on('race:start', onRaceStart)
    socket.connect()
    refreshLeaderboard()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('race:state', onRoomState)
      socket.off('race:start', onRaceStart)
    }
  }, [])

  useEffect(() => {
    const game = gameRef.current
    if (panel && game.mode === 'playing') game.mode = 'menu-paused'
    else if (!panel && game.mode === 'menu-paused') game.mode = 'playing'
  }, [panel])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let frameId
    let lastTime = performance.now()
    let lastStatsTime = 0
    let lastRaceUpdate = 0
    let width = 0
    let height = 0

    function resize() {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    function onKeyDown(event) {
      if (['ArrowRight', 'ArrowUp', ' '].includes(event.key)) event.preventDefault()
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'd' || event.key.toLowerCase() === 'w') {
        keysRef.current.gas = true
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key.toLowerCase() === 'a' || event.key.toLowerCase() === 's') {
        keysRef.current.brake = true
      }
      if (event.key === ' ' && !event.repeat) {
        const game = gameRef.current
        if (game.mode === 'playing') {
          game.mode = 'paused'
          setMode('paused')
        } else if (game.mode === 'paused') {
          game.mode = 'playing'
          setMode('playing')
        }
      }
    }

    function onKeyUp(event) {
      if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', ' '].includes(event.key)) event.preventDefault()
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'd' || event.key.toLowerCase() === 'w') {
        keysRef.current.gas = false
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key.toLowerCase() === 'a' || event.key.toLowerCase() === 's') {
        keysRef.current.brake = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    function frame(now) {
      const game = gameRef.current
      const delta = Math.min((now - lastTime) / 1000, 0.04)
      lastTime = now

      if (game.mode === 'playing') {
        if (keysRef.current.gas && game.fuel > 0) game.speed += 420 * delta
        else game.speed -= 28 * delta
        if (keysRef.current.brake) game.speed -= 590 * delta
        game.speed = Math.max(-110, Math.min(390, game.speed))
        game.worldX = Math.max(0, game.worldX + game.speed * delta)
        game.wheelSpin += game.speed * delta / 12
        game.cameraX = Math.max(0, game.worldX - width * 0.3)
        if (keysRef.current.gas && game.speed > 0) {
          game.fuel = Math.max(0, game.fuel - delta * (0.55 + game.speed / 390 * 1.15))
        }

        const slope = Math.atan2(
          terrainY(game.worldX + 30, height) - terrainY(game.worldX - 30, height),
          60,
        )
        const coinIndex = Math.round((game.worldX - 180) / 360)
        const coinX = 180 + coinIndex * 360
        if (coinIndex >= 0 && Math.abs(game.worldX - coinX) < 39 && !game.coinsCollected.has(coinIndex)) {
          game.coinsCollected.add(coinIndex)
          game.coins += 1
        }
        const fuelIndex = Math.round((game.worldX - 2050) / 3000)
        const fuelX = 2050 + fuelIndex * 3000
        if (fuelIndex >= 0 && Math.abs(game.worldX - fuelX) < 45 && !game.fuelCollected.has(fuelIndex)) {
          game.fuelCollected.add(fuelIndex)
          game.fuel = Math.min(100, game.fuel + 38)
        }
        if ((Math.abs(slope) > 0.76 && Math.abs(game.speed) > 205) || game.fuel <= 0) {
          game.mode = 'wrecked'
          game.crashAngle = slope * 1.9 + (game.speed < 0 ? Math.PI : 0)
          game.speed = 0
          keysRef.current = { gas: false, brake: false }
          setMode('wrecked')
        }

        const distance = Math.floor(game.worldX / 10)
        if (game.mode === 'wrecked' && !game.scoreSubmitted) {
          game.scoreSubmitted = true
          const result = { distance, speed: 0, coins: game.coins, finished: true }
          if (raceRef.current?.status === 'racing') {
            socket.emit('race:progress', result)
          } else if (distance > 0) {
            fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: localStorage.getItem('overland-player') || 'Trailblazer', distance, coins: game.coins }),
            }).then((response) => response.ok && refreshLeaderboard()).catch(() => {})
          }
        }
        if (distance > game.best) {
          game.best = distance
          localStorage.setItem('overland-best', String(distance))
        }
        if (now - lastStatsTime > 100) {
          setStats({ distance, best: game.best, coins: game.coins, fuel: game.fuel, speed: Math.round(Math.abs(game.speed) / 3.9) })
          lastStatsTime = now
        }
        if (raceRef.current?.status === 'racing' && now - lastRaceUpdate >= 250) {
          socket.emit('race:progress', {
            distance,
            speed: Math.round(Math.abs(game.speed) / 3.9),
            coins: game.coins,
          })
          lastRaceUpdate = now
        }
      }

      drawLandscape(context, width, height, game.cameraX, now)
      drawWorld(context, width, height, game, now)
      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  function pressControl(control) {
    keysRef.current[control] = true
  }

  function releaseControl(control) {
    keysRef.current[control] = false
  }

  return (
    <main className="game-shell">
      <canvas className="game-canvas" ref={canvasRef} aria-label="Hill climb game landscape" />
      <header className="topbar">
        <a className="brand" href="#game" aria-label="Overland home">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OVERLAND<span className="brand-sub"> / HILL CLIMB</span></span>
        </a>
        <div className="run-stats" aria-live="polite">
          <div className="stat-block"><span className="stat-label">DISTANCE</span><span className="stat-value">{stats.distance}<small> m</small></span></div>
          <div className="stat-block best-stat"><span className="stat-label">BEST RUN</span><span className="stat-value">{stats.best}<small> m</small></span></div>
          <div className="stat-block coin-stat"><span className="stat-label">COINS</span><span className="stat-value coin-number"><span aria-hidden="true">✦</span> {stats.coins}</span></div>
        </div>
        <div className="top-actions">
          <button className="nav-action" type="button" onClick={() => { setNotice(''); setPanel('leaderboard'); refreshLeaderboard() }} aria-label="Open leaderboard" title="Leaderboard"><span aria-hidden="true">≡</span><span className="nav-action-label">SCORES</span></button>
          <button className="nav-action race-action" type="button" onClick={() => { setNotice(''); setNameDraft(playerName); setPanel('race') }} aria-label="Open live race" title="Live race"><span className="connection-light" data-connected={serverConnected} /><span className="nav-action-label">RACE</span></button>
        </div>
        <button className="pause-button" type="button" onClick={togglePause} aria-label={mode === 'paused' ? 'Resume game' : 'Pause game'} title={mode === 'paused' ? 'Resume' : 'Pause'}>
          <span aria-hidden="true">{mode === 'paused' ? '▶' : 'Ⅱ'}</span>
        </button>
      </header>

      <section className="fuel-panel" aria-label={`Fuel ${Math.round(stats.fuel)} percent`}>
        <div className="fuel-topline"><span>FUEL</span><span>{Math.round(stats.fuel)}%</span></div>
        <div className="fuel-track"><span style={{ width: `${stats.fuel}%` }} /></div>
      </section>

      <div className="location-tag"><span className="location-dot" /> RIDGE TRAIL <span className="location-divider">/</span> STAGE 01</div>

      {race?.status === 'racing' && (
        <aside className="race-tracker" aria-live="polite">
          <div className="tracker-heading"><span className="live-pulse" /> LIVE RACE <span>{race.code}</span></div>
          {race.players.map((racer) => (
            <div className="tracker-row" key={racer.id}>
              <span className="tracker-name">{racer.id === socket.id ? 'YOU' : racer.name}</span>
              <span className="tracker-distance">{racer.distance}<small>m</small></span>
            </div>
          ))}
        </aside>
      )}

      {panel && (
        <div className="state-overlay multiplayer-overlay">
          <section className={`state-panel multiplayer-panel ${panel === 'leaderboard' ? 'score-panel' : ''}`} role="dialog" aria-modal="true" aria-labelledby="multiplayer-title">
            <div className="panel-heading">
              <span className="state-kicker">{panel === 'leaderboard' ? 'TRAIL RECORDS' : 'RACE CONTROL'}</span>
              <button className="panel-close" type="button" onClick={() => setPanel(null)} aria-label="Close panel">×</button>
            </div>
            {panel === 'leaderboard' ? (
              <>
                <h1 id="multiplayer-title">Top drivers.</h1>
                <p className="panel-intro">The longest runs on Ridge Trail.</p>
                <div className="leaderboard-list">
                  {leaderboard.length ? leaderboard.map((entry, index) => (
                    <div className="leaderboard-row" key={`${entry.createdAt}-${entry.name}-${index}`}>
                      <span className="leaderboard-rank">{String(index + 1).padStart(2, '0')}</span>
                      <span className="leaderboard-driver">{entry.name}<small>{entry.coins} coins</small></span>
                      <span className="leaderboard-distance">{entry.distance}<small>m</small></span>
                    </div>
                  )) : <div className="empty-leaderboard">No scores yet. Your first run can set the record.</div>}
                </div>
                <button className="primary-button panel-primary" type="button" onClick={() => { setNotice(''); setPanel('race') }}><span>JOIN A LIVE RACE</span><span aria-hidden="true">↗</span></button>
              </>
            ) : race ? (
              <>
                <h1 id="multiplayer-title">Room {race.code}.</h1>
                <p className="panel-intro">{race.status === 'waiting' ? 'Share the invite code. Up to four drivers can join.' : 'Distance updates are live for everyone in this room.'}</p>
                <button className="invite-code" type="button" onClick={() => navigator.clipboard?.writeText(race.code).then(() => setNotice('Invite code copied.')).catch(() => setNotice(`Invite code: ${race.code}`))}>
                  <span>{race.code}</span><small>COPY CODE</small>
                </button>
                <div className="racer-list">
                  {race.players.map((racer, index) => (
                    <div className="racer-row" key={racer.id}>
                      <span className={`racer-avatar avatar-${index}`}>{racer.name.slice(0, 1).toUpperCase()}</span>
                      <span className="racer-name">{racer.name}{racer.id === race.hostId && <small>HOST</small>}</span>
                      <span className="racer-distance">{race.status === 'racing' ? `${racer.distance}m` : 'READY'}</span>
                    </div>
                  ))}
                </div>
                {race.status === 'waiting' && race.hostId === socket.id ? (
                  <button className="primary-button panel-primary" type="button" onClick={startRace}><span>START RACE</span><span aria-hidden="true">↗</span></button>
                ) : race.status === 'waiting' ? <div className="waiting-message"><span className="live-pulse" /> Waiting for the host to start</div> : (
                  <button className="primary-button panel-primary" type="button" onClick={() => setPanel(null)}><span>BACK TO THE TRAIL</span><span aria-hidden="true">↗</span></button>
                )}
                <button className="leave-race" type="button" onClick={() => { leaveRace(); setPanel(null) }}>LEAVE ROOM</button>
              </>
            ) : (
              <>
                <h1 id="multiplayer-title">Race your friends.</h1>
                <p className="panel-intro">Create a room and share the code, or join a driver already on the trail.</p>
                <label className="field-label" htmlFor="driver-name">DRIVER NAME</label>
                <input className="panel-input" id="driver-name" maxLength={18} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="Your name" />
                <button className="primary-button panel-primary" type="button" onClick={createRace}><span>CREATE A RACE ROOM</span><span aria-hidden="true">↗</span></button>
                <div className="join-divider"><span /> OR JOIN WITH CODE <span /></div>
                <div className="join-row">
                  <input className="panel-input code-input" aria-label="Race invite code" maxLength={5} value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="5-CHAR CODE" />
                  <button className="join-button" type="button" onClick={joinRace} aria-label="Join race room">JOIN <span aria-hidden="true">→</span></button>
                </div>
              </>
            )}
            {notice && <div className="panel-notice" role="status">{notice}</div>}
            {!serverConnected && <div className="connection-note"><span className="connection-light" data-connected="false" /> Reconnecting to race server</div>}
          </section>
        </div>
      )}

      {mode !== 'playing' && (
        <div className="state-overlay">
          <div className="state-panel">
            <span className="state-kicker">{mode === 'paused' ? 'TAKE A BREATHER' : 'TRAIL ENDED'}</span>
            <h1>{mode === 'paused' ? 'Paused.' : 'That was a rough landing.'}</h1>
            <p>{mode === 'paused' ? 'Your ride is right where you left it.' : `You made it ${stats.distance} meters and picked up ${stats.coins} coins.`}</p>
            <button className="primary-button" type="button" onClick={mode === 'paused' ? togglePause : restart}>
              <span>{mode === 'paused' ? 'BACK TO THE TRAIL' : 'TAKE ANOTHER RUN'}</span><span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      )}

      <div className="bottom-ui">
        <div className="drive-hint"><span className="hint-key">←</span><span className="hint-key">→</span><span className="hint-copy">BALANCE & DRIVE</span></div>
        <div className="speed-readout"><span className="speed-number">{stats.speed}</span><span className="speed-unit">KM / H</span></div>
        <div className="touch-controls" aria-label="Driving controls">
          <button className="control-button brake-control" type="button" aria-label="Brake or reverse" onPointerDown={() => pressControl('brake')} onPointerUp={() => releaseControl('brake')} onPointerCancel={() => releaseControl('brake')} onPointerLeave={() => releaseControl('brake')}>BRAKE</button>
          <button className="control-button gas-control" type="button" aria-label="Accelerate" onPointerDown={() => pressControl('gas')} onPointerUp={() => releaseControl('gas')} onPointerCancel={() => releaseControl('gas')} onPointerLeave={() => releaseControl('gas')}>GAS <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div className="keyboard-note">ARROWS / WASD TO DRIVE <span>·</span> SPACE TO PAUSE</div>
    </main>
  )
}

export default App
