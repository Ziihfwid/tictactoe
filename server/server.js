const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const {
createRoom,
getRoom,
deleteRoom
} = require("./rooms");

const {
checkWinner,
isValidMove
} = require("./gameLogic");

const matchmaking = require("./matchmaking");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const clientPath = path.join(__dirname, "..", "client");

app.use(express.static(clientPath));

function makeRoomCode() {
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let code;

do {
code = Array.from(
{ length: 5 },
() => chars[Math.floor(Math.random() * chars.length)]
).join("");
} while (getRoom(code));

return code;
}

function publicState(room) {
return {
roomId: room.roomId,
board: room.board,
turn: room.turn,
winner: room.winner,
winningLine: room.winningLine,

```
players: Object.fromEntries(
  Object.entries(room.players).map(([id, player]) => [
    id,
    {
      username: player.username,
      symbol: player.symbol
    }
  ])
)
```

};
}

function joinRoom(socket, room, username, symbol) {
room.players[socket.id] = {
username,
symbol
};

socket.join(room.roomId);

socket.data.roomId = room.roomId;
socket.data.symbol = symbol;
socket.data.username = username;

io.to(room.roomId).emit(
"state",
publicState(room)
);
}

io.on("connection", socket => {

console.log("Player connected:", socket.id);

// -----------------------------
// CREATE PRIVATE ROOM
// -----------------------------

socket.on("createPrivateRoom", ({ username }) => {

```
const room = createRoom(
  makeRoomCode()
);

joinRoom(
  socket,
  room,
  username || "Player",
  "X"
);

socket.emit(
  "privateRoomCreated",
  {
    roomId: room.roomId
  }
);
```

});

// -----------------------------
// JOIN PRIVATE ROOM
// -----------------------------

socket.on("joinPrivateRoom", ({ username, roomId }) => {

```
const code = String(roomId || "")
  .trim()
  .toUpperCase();

const room = getRoom(code);

if (!room) {

  return socket.emit(
    "errorMessage",
    "Room not found."
  );
}

if (
  Object.keys(room.players).length >= 2
) {

  return socket.emit(
    "errorMessage",
    "That room is full."
  );
}

joinRoom(
  socket,
  room,
  username || "Player",
  "O"
);

io.to(room.roomId).emit(
  "state",
  publicState(room)
);
```

});

// -----------------------------
// QUICK MATCH
// -----------------------------

socket.on("quickMatch", ({ username }) => {

```
const opponent =
  matchmaking.addPlayer(socket);

if (!opponent) {

  socket.data.searching = true;

  socket.data.username =
    username || "Player";

  socket.emit(
    "matchSearching"
  );

  return;
}

opponent.data.searching = false;

const room = createRoom(
  makeRoomCode()
);

joinRoom(
  opponent,
  room,
  opponent.data.username || "Player",
  "X"
);

joinRoom(
  socket,
  room,
  username || "Player",
  "O"
);

io.to(room.roomId).emit(
  "matchFound",
  {
    roomId: room.roomId
  }
);

io.to(room.roomId).emit(
  "state",
  publicState(room)
);
```

});

// -----------------------------
// SERVER-VALIDATED MOVE
// -----------------------------

socket.on("move", position => {

```
const room = getRoom(
  socket.data.roomId
);

if (!room) {

  return socket.emit(
    "errorMessage",
    "You are not in a game."
  );
}

if (room.winner) {

  return socket.emit(
    "errorMessage",
    "This game is already over."
  );
}

const player =
  room.players[socket.id];

if (!player) {

  return socket.emit(
    "errorMessage",
    "You are not in this room."
  );
}

if (
  player.symbol !== room.turn
) {

  return socket.emit(
    "errorMessage",
    "It is not your turn."
  );
}

if (
  !isValidMove(
    room.board,
    position
  )
) {

  return socket.emit(
    "errorMessage",
    "Invalid move."
  );
}

room.board[position] =
  player.symbol;

const result =
  checkWinner(room.board);

if (result.winner) {

  room.winner =
    result.winner;

  room.winningLine =
    result.line;

} else {

  room.turn =
    room.turn === "X"
      ? "O"
      : "X";
}

io.to(room.roomId).emit(
  "state",
  publicState(room)
);
```

});

// -----------------------------
// ONLINE RESTART READY SYSTEM
// -----------------------------

socket.on("requestRestart", () => {

```
const room = getRoom(
  socket.data.roomId
);

if (!room) {

  return socket.emit(
    "errorMessage",
    "Game room not found."
  );
}

if (
  Object.keys(room.players).length < 2
) {

  return socket.emit(
    "errorMessage",
    "Waiting for another player."
  );
}

if (!room.restartReady) {

  room.restartReady = [];
}

if (
  !room.restartReady.includes(
    socket.id
  )
) {

  room.restartReady.push(
    socket.id
  );
}

const ready =
  room.restartReady.length;

io.to(room.roomId).emit(
  "restartStatus",
  {
    ready,
    total: 2
  }
);

if (ready >= 2) {

  room.board =
    Array(9).fill("");

  room.turn = "X";

  room.winner = null;

  room.winningLine = [];

  room.restartReady = [];

  io.to(room.roomId).emit(
    "state",
    publicState(room)
  );
}
```

});

// -----------------------------
// CANCEL MATCHMAKING
// -----------------------------

socket.on("cancelSearch", () => {

```
matchmaking.removePlayer(
  socket
);

socket.data.searching =
  false;
```

});

// -----------------------------
// DISCONNECT
// -----------------------------

socket.on("disconnect", () => {

```
console.log(
  "Player disconnected:",
  socket.id
);

matchmaking.removePlayer(
  socket
);

const room =
  getRoom(
    socket.data.roomId
  );

if (!room) {

  return;
}

delete room.players[
  socket.id
];

io.to(room.roomId).emit(
  "opponentDisconnected"
);

if (
  Object.keys(room.players).length === 0
) {

  deleteRoom(
    room.roomId
  );

} else {

  room.restartReady = [];

  io.to(room.roomId).emit(
    "state",
    publicState(room)
  );
}
```

});
});

app.get("*", (_, res) => {

res.sendFile(
path.join(
clientPath,
"index.html"
)
);
});

server.listen(
PORT,
() => {

```
console.log(
  `Tic Tac Toe running at http://localhost:${PORT}`
);
```

}
);
