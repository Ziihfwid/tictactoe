const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(
express.static(
path.join(__dirname, "..", "client")
)
);

const rooms = new Map();

const matchmakingQueue = [];

function createRoom() {

let roomId;

do {

```
roomId =
  Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase();
```

} while (
rooms.has(roomId)
);

const room = {

```
roomId,

board: Array(9).fill(""),

turn: "X",

winner: null,

winningLine: [],

restartReady: new Set(),

players: {}
```

};

rooms.set(
roomId,
room
);

return room;
}

function getRoom(socket) {

return rooms.get(
socket.data.roomId
);
}

function getWinner(board) {

const winningLines = [

```
[0, 1, 2],

[3, 4, 5],

[6, 7, 8],

[0, 3, 6],

[1, 4, 7],

[2, 5, 8],

[0, 4, 8],

[2, 4, 6]
```

];

for (
const line of winningLines
) {

```
const [
  a,
  b,
  c
] = line;

if (

  board[a] !== "" &&

  board[a] === board[b] &&

  board[a] === board[c]

) {

  return {

    winner: board[a],

    line

  };
}
```

}

if (
board.every(
cell => cell !== ""
)
) {

```
return {

  winner: "draw",

  line: []

};
```

}

return {

```
winner: null,

line: []
```

};
}

function publicRoom(room) {

return {

```
roomId: room.roomId,

board: room.board,

turn: room.turn,

winner: room.winner,

winningLine:
  room.winningLine,

players:
  room.players
```

};
}

function sendRoomState(room) {

io.to(
room.roomId
).emit(
"state",
publicRoom(room)
);
}

function addPlayerToRoom(
socket,
room,
username,
symbol
) {

room.players[
socket.id
] = {

```
username:
  username || "Player",

symbol
```

};

socket.join(
room.roomId
);

socket.data.roomId =
room.roomId;

socket.data.symbol =
symbol;
}

io.on(
"connection",
socket => {

```
console.log(
  "Connected:",
  socket.id
);

// -------------------------
// CREATE PRIVATE ROOM
// -------------------------

socket.on(
  "createPrivateRoom",
  ({ username }) => {

    const room =
      createRoom();

    addPlayerToRoom(
      socket,
      room,
      username,
      "X"
    );

    socket.emit(
      "privateRoomCreated",
      {

        roomId:
          room.roomId

      }
    );

    sendRoomState(
      room
    );
  }
);

// -------------------------
// JOIN PRIVATE ROOM
// -------------------------

socket.on(
  "joinPrivateRoom",
  ({
    username,
    roomId
  }) => {

    const room =
      rooms.get(
        String(
          roomId
        )
          .trim()
          .toUpperCase()
      );

    if (
      !room
    ) {

      socket.emit(
        "errorMessage",
        "Room not found."
      );

      return;
    }

    if (
      Object.keys(
        room.players
      ).length >= 2
    ) {

      socket.emit(
        "errorMessage",
        "Room is full."
      );

      return;
    }

    addPlayerToRoom(
      socket,
      room,
      username,
      "O"
    );

    sendRoomState(
      room
    );
  }
);

// -------------------------
// QUICK MATCH
// -------------------------

socket.on(
  "quickMatch",
  ({ username }) => {

    socket.data.username =
      username || "Player";

    const opponent =
      matchmakingQueue.shift();

    if (
      !opponent
    ) {

      matchmakingQueue.push(
        socket
      );

      socket.emit(
        "matchSearching"
      );

      return;
    }

    const room =
      createRoom();

    addPlayerToRoom(
      opponent,
      room,
      opponent.data.username,
      "X"
    );

    addPlayerToRoom(
      socket,
      room,
      username,
      "O"
    );

    io.to(
      room.roomId
    ).emit(
      "matchFound",
      {

        roomId:
          room.roomId

      }
    );

    sendRoomState(
      room
    );
  }
);

// -------------------------
// MOVE
// -------------------------

socket.on(
  "move",
  position => {

    const room =
      getRoom(
        socket
      );

    if (
      !room
    ) {

      return;
    }

    const player =
      room.players[
        socket.id
      ];

    if (
      !player
    ) {

      return;
    }

    if (
      room.winner
    ) {

      return;
    }

    if (
      player.symbol !==
      room.turn
    ) {

      socket.emit(
        "errorMessage",
        "It is not your turn."
      );

      return;
    }

    if (
      typeof position !==
      "number"
      ||
      position < 0
      ||
      position > 8
      ||
      room.board[position] !== ""
    ) {

      socket.emit(
        "errorMessage",
        "Invalid move."
      );

      return;
    }

    room.board[position] =
      player.symbol;

    const result =
      getWinner(
        room.board
      );

    if (
      result.winner
    ) {

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

    sendRoomState(
      room
    );
  }
);

// -------------------------
// READY TO RESTART
// -------------------------

socket.on(
  "requestRestart",
  () => {

    const room =
      getRoom(
        socket
      );

    if (
      !room
    ) {

      return;
    }

    if (
      Object.keys(
        room.players
      ).length < 2
    ) {

      socket.emit(
        "errorMessage",
        "You need another player first."
      );

      return;
    }

    room.restartReady.add(
      socket.id
    );

    io.to(
      room.roomId
    ).emit(
      "restartStatus",
      {

        ready:
          room.restartReady.size,

        total: 2

      }
    );

    if (
      room.restartReady.size >= 2
    ) {

      room.board =
        Array(9).fill("");

      room.turn =
        "X";

      room.winner =
        null;

      room.winningLine =
        [];

      room.restartReady.clear();

      io.to(
        room.roomId
      ).emit(
        "restartStarted"
      );

      sendRoomState(
        room
      );
    }
  }
);

// -------------------------
// CANCEL SEARCH
// -------------------------

socket.on(
  "cancelSearch",
  () => {

    const index =
      matchmakingQueue.indexOf(
        socket
      );

    if (
      index !== -1
    ) {

      matchmakingQueue.splice(
        index,
        1
      );
    }
  }
);

// -------------------------
// DISCONNECT
// -------------------------

socket.on(
  "disconnect",
  () => {

    const queueIndex =
      matchmakingQueue.indexOf(
        socket
      );

    if (
      queueIndex !== -1
    ) {

      matchmakingQueue.splice(
        queueIndex,
        1
      );
    }

    const room =
      getRoom(
        socket
      );

    if (
      !room
    ) {

      return;
    }

    delete room.players[
      socket.id
    ];

    room.restartReady.clear();

    io.to(
      room.roomId
    ).emit(
      "opponentDisconnected"
    );

    sendRoomState(
      room
    );

    if (
      Object.keys(
        room.players
      ).length === 0
    ) {

      rooms.delete(
        room.roomId
      );
    }
  }
);
```

}
);

app.get(
"*",
(
request,
response
) => {

```
response.sendFile(
  path.join(
    __dirname,
    "..",
    "client",
    "index.html"
  )
);
```

}
);

server.listen(
PORT,
() => {

```
console.log(
  `Server running on port ${PORT}`
);
```

}
);
