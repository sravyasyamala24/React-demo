import { randomInt } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const root = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(root, 'data')
const scoresFile = path.join(dataDirectory, 'leaderboard.json')
const port = Number(process.env.PORT || 3001)
const app = express()
const httpServer = createServer(app)
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim())
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins?.length ? allowedOrigins : true },
})
const rooms = new Map()
let scoreQueue = Promise.resolve()

app.disable('x-powered-by')
app.use(express.json({ limit: '8kb' }))

async function readScores() {
  try {
    const content = await readFile(scoresFile, 'utf8')
    const scores = JSON.parse(content)
    return Array.isArray(scores) ? scores : []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    console.error('Could not read the leaderboard:', error)
    return []
  }
}

async function saveScore(entry) {
  scoreQueue = scoreQueue.catch(() => {}).then(async () => {
    const scores = await readScores()
    scores.push(entry)
    scores.sort((left, right) => right.distance - left.distance || right.coins - left.coins)
    const nextScores = scores.slice(0, 100)
    await mkdir(dataDirectory, { recursive: true })
    const temporaryFile = `${scoresFile}.tmp`
    await writeFile(temporaryFile, JSON.stringify(nextScores, null, 2), 'utf8')
    await rename(temporaryFile, scoresFile)
    return nextScores
  })
  return scoreQueue
}

function cleanName(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 18)
}

function cleanDistance(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1000000, Math.floor(value))) : 0
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    startedAt: room.startedAt,
    players: [...room.players.values()].map((player) => ({ ...player })),
  }
}

function broadcastRoom(room) {
  io.to(room.code).emit('race:state', roomSnapshot(room))
}

function removeFromRoom(socket) {
  const code = socket.data.roomCode
  if (!code) return
  const room = rooms.get(code)
  socket.leave(code)
  delete socket.data.roomCode
  if (!room) return
  room.players.delete(socket.id)
  if (room.players.size === 0) {
    rooms.delete(code)
    return
  }
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value
  broadcastRoom(room)
}

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do {
    code = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('')
  } while (rooms.has(code))
  return code
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', realtime: io.engine.clientsCount, rooms: rooms.size })
})

app.get('/api/leaderboard', async (_request, response) => {
  response.set('Cache-Control', 'no-store')
  response.json((await readScores()).slice(0, 20))
})

app.post('/api/scores', async (request, response) => {
  const name = cleanName(request.body?.name)
  const distance = cleanDistance(request.body?.distance)
  const coins = cleanDistance(request.body?.coins)
  if (!name || distance < 1) {
    response.status(400).json({ error: 'A driver name and a positive distance are required.' })
    return
  }
  try {
    const entry = { name, distance, coins, createdAt: new Date().toISOString() }
    const scores = await saveScore(entry)
    response.status(201).json({ entry, scores: scores.slice(0, 20) })
  } catch (error) {
    console.error('Could not save score:', error)
    response.status(500).json({ error: 'The score could not be saved.' })
  }
})

io.on('connection', (socket) => {
  socket.on('race:create', (payload, reply = () => {}) => {
    removeFromRoom(socket)
    const name = cleanName(payload?.name)
    if (!name) return reply({ error: 'Enter a driver name first.' })
    const code = createRoomCode()
    const room = {
      code,
      hostId: socket.id,
      status: 'waiting',
      startedAt: null,
      players: new Map([[socket.id, { id: socket.id, name, distance: 0, speed: 0, coins: 0, finished: false }]]),
    }
    rooms.set(code, room)
    socket.data.roomCode = code
    socket.join(code)
    reply({ room: roomSnapshot(room) })
  })

  socket.on('race:join', (payload, reply = () => {}) => {
    removeFromRoom(socket)
    const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : ''
    const name = cleanName(payload?.name)
    const room = rooms.get(code)
    if (!name) return reply({ error: 'Enter a driver name first.' })
    if (!room || room.status !== 'waiting') return reply({ error: 'That room is unavailable. Check the code or create a new race.' })
    if (room.players.size >= 4) return reply({ error: 'This race already has four drivers.' })
    room.players.set(socket.id, { id: socket.id, name, distance: 0, speed: 0, coins: 0, finished: false })
    socket.data.roomCode = code
    socket.join(code)
    broadcastRoom(room)
    reply({ room: roomSnapshot(room) })
  })

  socket.on('race:start', (reply = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room || room.hostId !== socket.id || room.status !== 'waiting') {
      return reply({ error: 'Only the race host can start a waiting room.' })
    }
    room.status = 'racing'
    room.startedAt = Date.now()
    for (const player of room.players.values()) {
      player.distance = 0
      player.speed = 0
      player.finished = false
    }
    broadcastRoom(room)
    io.to(room.code).emit('race:start', roomSnapshot(room))
    reply({ ok: true })
  })

  socket.on('race:progress', (payload) => {
    const room = rooms.get(socket.data.roomCode)
    const player = room?.players.get(socket.id)
    if (!room || room.status !== 'racing' || !player || player.finished) return
    player.distance = cleanDistance(payload?.distance)
    player.speed = Math.max(0, Math.min(120, Math.floor(Number(payload?.speed) || 0)))
    player.coins = cleanDistance(payload?.coins)
    if (payload?.finished === true) {
      player.finished = true
      player.finishedAt = Date.now()
      if (player.distance > 0) {
        saveScore({ name: player.name, distance: player.distance, coins: player.coins, createdAt: new Date().toISOString() })
          .catch((error) => console.error('Could not save race score:', error))
      }
    }
    broadcastRoom(room)
  })

  socket.on('race:leave', () => removeFromRoom(socket))
  socket.on('disconnect', () => removeFromRoom(socket))
})

const productionDirectory = path.join(root, 'dist')
app.use(express.static(productionDirectory, { index: false }))
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api/')) return next()
  response.sendFile(path.join(productionDirectory, 'index.html'), (error) => {
    if (error) next(error)
  })
})

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Overland server listening on http://localhost:${port}`)
})