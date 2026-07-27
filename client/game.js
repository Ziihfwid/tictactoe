const socket =
window.gameSocket;

let currentMode =
null;

let difficulty =
"medium";

let board =
Array(9).fill("");

let turn =
"X";

let winner =
null;

let winningLine =
[];

let mySymbol =
"X";

let roomId =
null;

let restartClicked =
false;

let username =
localStorage.getItem(
"ttt_username"
)
||
"Player";

let stats =
JSON.parse(
localStorage.getItem(
"ttt_stats"
)
||
JSON.stringify({

```
  games: 0,

  wins: 0,

  losses: 0,

  draws: 0

})
```

);

// =================================
// HELPERS
// =================================

function $(selector) {

return document.querySelector(
selector
);
}

function $$(selector) {

return [
...document.querySelectorAll(
selector
)
];
}

function showScreen(id) {

$$(".screen").forEach(
screen => {

```
  screen.classList.remove(
    "active"
  );
}
```

);

const screen =
$(`#${id}`);

if (
screen
) {

```
screen.classList.add(
  "active"
);
```

}
}

function getUsername() {

const input =
$("#usernameInput");

if (
input &&
input.value.trim()
) {

```
username =
  input.value.trim();

localStorage.setItem(
  "ttt_username",
  username
);
```

}

return username;
}

function showMessage(message) {

const toast =
$("#toast");

if (
toast
) {

```
toast.textContent =
  message;

toast.classList.add(
  "show"
);

setTimeout(
  () => {

    toast.classList.remove(
      "show"
    );

  },
  2500
);
```

} else {

```
alert(
  message
);
```

}
}

// =================================
// WIN CHECKING
// =================================

function checkWinner(
currentBoard
) {

const lines = [

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
const line of lines
) {

```
const [
  a,
  b,
  c
] = line;

if (

  currentBoard[a] !== ""

  &&

  currentBoard[a] ===
  currentBoard[b]

  &&

  currentBoard[a] ===
  currentBoard[c]

) {

  return {

    winner:
      currentBoard[a],

    line

  };
}
```

}

if (
currentBoard.every(
cell =>
cell !== ""
)
) {

```
return {

  winner:
    "draw",

  line: []

};
```

}

return {

```
winner:
  null,

line: []
```

};
}

// =================================
// STATS
// =================================

function saveStats() {

localStorage.setItem(
"ttt_stats",
JSON.stringify(
stats
)
);
}

function recordResult(
result
) {

stats.games++;

if (
result === "draw"
) {

```
stats.draws++;
```

} else if (
result === mySymbol
) {

```
stats.wins++;
```

} else {

```
stats.losses++;
```

}

saveStats();
}

// =================================
// CPU AI
// =================================

function availableMoves() {

return board
.map(
(
cell,
index
) =>

```
    cell === ""
      ? index
      : null

)
.filter(
  index =>
    index !== null
);
```

}

function randomMove() {

const moves =
availableMoves();

if (
!moves.length
) {

```
return null;
```

}

return moves[
Math.floor(
Math.random()
*
moves.length
)
];
}

function winningMove(
symbol
) {

for (
const index of
availableMoves()
) {

```
board[index] =
  symbol;

const result =
  checkWinner(
    board
  );

board[index] =
  "";

if (
  result.winner ===
  symbol
) {

  return index;
}
```

}

return null;
}

function smartMove() {

const win =
winningMove(
"O"
);

if (
win !== null
) {

```
return win;
```

}

const block =
winningMove(
"X"
);

if (
block !== null
) {

```
return block;
```

}

if (
board[4] === ""
) {

```
return 4;
```

}

const corners =
[
0,
2,
6,
8
].filter(
index =>
board[index] === ""
);

if (
corners.length
) {

```
return corners[
  Math.floor(
    Math.random()
    *
    corners.length
  )
];
```

}

return randomMove();
}

function cpuMove() {

if (
difficulty ===
"easy"
) {

```
return randomMove();
```

}

if (
difficulty ===
"medium"
) {

```
// Medium is deliberately imperfect.
if (
  Math.random()
  <
  0.45
) {

  return randomMove();
}

return smartMove();
```

}

// Hard is strong, but still beatable.
if (
difficulty ===
"hard"
) {

```
if (
  Math.random()
  <
  0.18
) {

  return randomMove();
}

return smartMove();
```

}

return randomMove();
}

// =================================
// RENDER
// =================================

function renderBoard() {

$$(".cell").forEach(
(
cell,
index
) => {

```
  cell.textContent =
    board[index];

  cell.className =
    "cell";

  if (
    board[index]
  ) {

    cell.classList.add(
      board[index]
        .toLowerCase()
    );
  }

  if (
    winningLine.includes(
      index
    )
  ) {

    cell.classList.add(
      "win"
    );
  }

  cell.disabled =
    Boolean(
      board[index]
    )
    ||
    Boolean(
      winner
    )
    ||
    (
      currentMode ===
      "cpu"
      &&
      turn !==
      "X"
    )
    ||
    (
      currentMode ===
      "online"
      &&
      turn !==
      mySymbol
    );
}
```

);

const status =
$("#statusText");

if (
!status
) {

```
return;
```

}

if (
winner ===
"draw"
) {

```
status.textContent =
  "Draw!";
```

} else if (
winner
) {

```
status.textContent =
  `Player ${winner} Wins!`;
```

} else if (
currentMode ===
"cpu"
) {

```
status.textContent =
  turn === "X"
    ? "Your turn"
    : "CPU is thinking...";
```

} else {

```
status.textContent =
  turn === mySymbol
    ? "Your turn"
    : "Opponent's turn";
```

}
}

// =================================
// CPU GAME
// =================================

function startCPU(
selectedDifficulty
) {

currentMode =
"cpu";

difficulty =
selectedDifficulty;

board =
Array(9).fill("");

turn =
"X";

winner =
null;

winningLine =
[];

mySymbol =
"X";

restartClicked =
false;

$("#gameModeLabel")
&&
(
$("#gameModeLabel")
.textContent =
`VS CPU • ${difficulty.toUpperCase()}`
);

showScreen(
"gameScreen"
);

renderBoard();
}

function playCPU() {

if (
currentMode !==
"cpu"
||
winner
||
turn !==
"X"
) {

```
return;
```

}

const result =
checkWinner(
board
);

if (
result.winner
) {

```
winner =
  result.winner;

winningLine =
  result.line;

recordResult(
  winner
);

renderBoard();

return;
```

}

const move =
cpuMove();

if (
move === null
) {

```
return;
```

}

board[move] =
"O";

const cpuResult =
checkWinner(
board
);

if (
cpuResult.winner
) {

```
winner =
  cpuResult.winner;

winningLine =
  cpuResult.line;

recordResult(
  winner
);
```

} else {

```
turn =
  "X";
```

}

renderBoard();
}

function handleCPUClick(
index
) {

if (
winner
||
turn !== "X"
||
board[index] !== ""
) {

```
return;
```

}

board[index] =
"X";

const result =
checkWinner(
board
);

if (
result.winner
) {

```
winner =
  result.winner;

winningLine =
  result.line;

recordResult(
  winner
);

renderBoard();

return;
```

}

turn =
"O";

renderBoard();

setTimeout(
() => {

```
  if (
    !winner
  ) {

    playCPU();
  }

},
450
```

);
}

// =================================
// ONLINE GAME
// =================================

function startOnline() {

currentMode =
"online";

restartClicked =
false;

showScreen(
"gameScreen"
);

renderBoard();
}

function handleOnlineClick(
index
) {

if (
winner
||
board[index] !== ""
||
turn !== mySymbol
) {

```
return;
```

}

socket.emit(
"move",
index
);
}

// =================================
// RESTART
// =================================

function restartGame() {

if (
currentMode ===
"cpu"
) {

```
board =
  Array(9).fill("");

turn =
  "X";

winner =
  null;

winningLine =
  [];

restartClicked =
  false;

renderBoard();

return;
```

}

if (
currentMode ===
"online"
) {

```
if (
  restartClicked
) {

  showMessage(
    "You are already ready."
  );

  return;
}

restartClicked =
  true;

socket.emit(
  "requestRestart"
);
```

}
}

// =================================
// BUTTONS
// =================================

$("#cpuBtn")
?.addEventListener(
"click",
() => {

```
  showScreen(
    "difficultyScreen"
  );
}
```

);

$("#onlineBtn")
?.addEventListener(
"click",
() => {

```
  showScreen(
    "onlineScreen"
  );
}
```

);

$("#settingsBtn")
?.addEventListener(
"click",
() => {

```
  showScreen(
    "settingsScreen"
  );
}
```

);

$$(
"[data-difficulty]"
).forEach(
button => {

```
button.addEventListener(
  "click",
  () => {

    startCPU(
      button.dataset
        .difficulty
    );
  }
);
```

}
);

$$(
".cell"
).forEach(
cell => {

```
cell.addEventListener(
  "click",
  () => {

    const index =
      Number(
        cell.dataset.index
      );

    if (
      currentMode ===
      "cpu"
    ) {

      handleCPUClick(
        index
      );

    } else if (
      currentMode ===
      "online"
    ) {

      handleOnlineClick(
        index
      );
    }
  }
);
```

}
);

$("#restartBtn")
?.addEventListener(
"click",
restartGame
);

$("#returnMenuBtn")
?.addEventListener(
"click",
() => {

```
  showScreen(
    "menuScreen"
  );
}
```

);

$("#quickMatchBtn")
?.addEventListener(
"click",
() => {

```
  socket.emit(
    "quickMatch",
    {

      username:
        getUsername()

    }
  );

  showScreen(
    "waitingScreen"
  );
}
```

);

$("#cancelSearchBtn")
?.addEventListener(
"click",
() => {

```
  socket.emit(
    "cancelSearch"
  );

  showScreen(
    "onlineScreen"
  );
}
```

);

$("#createRoomBtn")
?.addEventListener(
"click",
() => {

```
  socket.emit(
    "createPrivateRoom",
    {

      username:
        getUsername()

    }
  );
}
```

);

$("#joinRoomBtn")
?.addEventListener(
"click",
() => {

```
  const input =
    $("#roomCodeInput");

  if (
    !input
  ) {

    return;
  }

  socket.emit(
    "joinPrivateRoom",
    {

      username:
        getUsername(),

      roomId:
        input.value
          .trim()
          .toUpperCase()

    }
  );
}
```

);

// =================================
// SOCKET EVENTS
// =================================

socket.on(
"privateRoomCreated",
data => {

```
roomId =
  data.roomId;

const display =
  $("#roomCodeDisplay");

if (
  display
) {

  display.textContent =
    roomId;
}

showScreen(
  "roomScreen"
);
```

}
);

socket.on(
"matchSearching",
() => {

```
showScreen(
  "waitingScreen"
);
```

}
);

socket.on(
"matchFound",
data => {

```
roomId =
  data.roomId;

startOnline();
```

}
);

socket.on(
"state",
state => {

```
if (
  state.players
) {

  const me =
    state.players[
      socket.id
    ];

  if (
    me
  ) {

    mySymbol =
      me.symbol;
  }
}

if (
  state.roomId
) {

  roomId =
    state.roomId;
}

if (
  currentMode !==
  "online"
) {

  startOnline();
}

board =
  state.board;

turn =
  state.turn;

winner =
  state.winner;

winningLine =
  state.winningLine
  ||
  [];

renderBoard();
```

}
);

socket.on(
"restartStatus",
data => {

```
const status =
  $("#statusText");

if (
  status
) {

  status.textContent =
    `${data.ready}/${data.total} Ready`;
}
```

}
);

socket.on(
"restartStarted",
() => {

```
restartClicked =
  false;
```

}
);

socket.on(
"opponentDisconnected",
() => {

```
showMessage(
  "Opponent disconnected."
);

const status =
  $("#statusText");

if (
  status
) {

  status.textContent =
    "Opponent disconnected";
}
```

}
);

socket.on(
"errorMessage",
message => {

```
showMessage(
  message
);

restartClicked =
  false;
```

}
);

socket.on(
"connect_error",
() => {

```
showMessage(
  "Could not connect to the server."
);
```

}
);
