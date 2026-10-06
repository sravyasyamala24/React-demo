# Overland: Hill Climb

A browser-based hill climb game built with React, Vite, Express, and Socket.IO.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite client and Express/Socket.IO server start together. For a production build, run `npm run build` followed by `npm start`; the Express server serves the built client and API on port `3001` by default. Set `PORT` to change the production port.

## Play

- Hold **Right Arrow**, **Up Arrow**, **D**, **W**, or **GAS** to accelerate.
- Hold **Left Arrow**, **Down Arrow**, **A**, **S**, or **BRAKE** to brake/reverse.
- Press **Space** or the pause button to pause.
- Use **RACE** to create a room or join one with its five-character invite code. Rooms support up to four drivers; the host starts the race. Distance and speed update live.
- Scores from completed solo runs and multiplayer runs are stored in `data/leaderboard.json`.

## Service endpoints

- `GET /api/health` returns server and room status.
- `GET /api/leaderboard` returns the top 20 saved runs.
- `POST /api/scores` accepts `{ "name": "Driver", "distance": 1200, "coins": 3 }`.
- Socket.IO events: `race:create`, `race:join`, `race:start`, `race:progress`, `race:state`, and `race:leave`.

## Deployment notes

Build and run the Node service as one application process. Configure `PORT` with the hosting provider’s assigned port and, if cross-origin clients are hosted separately, set `CLIENT_ORIGIN` to a comma-separated allowlist of their origins. Use a persistent disk mounted at the application’s `data` directory if leaderboard scores must survive redeployments. Rooms are held in server memory, so use a single server instance; this first release has no accounts or server-side anti-cheat, and client-reported distances should not be treated as prize or payment data.
