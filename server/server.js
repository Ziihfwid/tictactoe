const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { createRoom, getRoom, deleteRoom } = require("./rooms");
const { checkWinner, isValidMove } = require("./gameLogic");
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
    code = Array.from({ length: 5 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
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
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, {
        username: p.username,
        symbol: p.symbol
      }])
    )
  };
}

function joinRoom(socket, room, username, symbol) {
  room.players[socket.id] = { username, symbol };
  socket.join(room.roomId);
  socket.data.roomId = room.roomId;
  socket.data.symbol = symbol;
  io.to(room.roomId).emit("state", publicState(room));
}

io.on("connection", socket => {
  socket.on("createPrivateRoom", ({ username }) => {
    const room = createRoom(makeRoomCode());
    joinRoom(socket, room, username || "Player", "X");
    socket.emit("privateRoomCreated", { roomId: room.roomId });
  });

  socket.on("joinPrivateRoom", ({ username, roomId }) => {
    const code = String(roomId || "").trim().toUpperCase();
    const room = getRoom(code);

    if (!room) return socket.emit("errorMessage", "Room not found.");
    if (Object.keys(room.players).length >= 2) {
      return socket.emit("errorMessage", "That room is full.");
    }

    joinRoom(socket, room, username || "Player", "O");
  });

  socket.on("quickMatch", ({ username }) => {
    const opponent = matchmaking.addPlayer(socket);

    if (!opponent) {
      socket.data.searching = true;
      socket.emit("matchSearching");
      return;
    }

    opponent.data.searching = false;
    const room = createRoom(makeRoomCode());

    joinRoom(opponent, room, opponent.data.username || "Player", "X");
    joinRoom(socket, room, username || "Player", "O");
    io.to(room.roomId).emit("matchFound", { roomId: room.roomId });
    io.to(room.roomId).emit("state", publicState(room));
  });

  socket.on("move", position => {
    const room = getRoom(socket.data.roomId);
    if (!room || room.winner) return;

    const player = room.players[socket.id];
    if (!player) return socket.emit("errorMessage", "You are not in this game.");
    if (player.symbol !== room.turn) return socket.emit("errorMessage", "It is not your turn.");
    if (!isValidMove(room.board, position)) return socket.emit("errorMessage", "Invalid move.");

    room.board[position] = player.symbol;
    const result = checkWinner(room.board);

    if (result.winner) {
      room.winner = result.winner;
      room.winningLine = result.line;
    } else {
      room.turn = room.turn === "X" ? "O" : "X";
    }

    io.to(room.roomId).emit("state", publicState(room));
  });

  socket.on("cancelSearch", () => {
    matchmaking.removePlayer(socket);
    socket.data.searching = false;
  });

  socket.on("disconnect", () => {
    matchmaking.removePlayer(socket);

    const room = getRoom(socket.data.roomId);
    if (!room) return;

    delete room.players[socket.id];
    socket.to(room.roomId).emit("opponentDisconnected");

    if (Object.keys(room.players).length === 0) {
      deleteRoom(room.roomId);
    } else {
      io.to(room.roomId).emit("state", publicState(room));
    }
  });
});

app.get("*", (_, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Tic Tac Toe running at http://localhost:${PORT}`);
});
