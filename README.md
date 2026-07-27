# Tic Tac Toe

A complete modern Tic Tac Toe web app with:

- Player vs CPU
- Easy, Medium, and unbeatable Hard AI
- Real-time Socket.IO PvP
- Quick Match matchmaking
- Private rooms with room codes
- Server-authoritative multiplayer validation
- Usernames and local statistics
- Settings for sound, animations, and theme
- Responsive dark gaming UI

## Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

For online multiplayer testing, open the app in two browser tabs or two devices connected to the same server.

## Project Structure

```text
tic-tac-toe/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── socket.js
├── server/
│   ├── server.js
│   ├── gameLogic.js
│   ├── matchmaking.js
│   └── rooms.js
├── package.json
└── README.md
```
