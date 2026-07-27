const socket = window.gameSocket;

const $ = selector =>
document.querySelector(selector);

const $$ = selector =>
[...document.querySelectorAll(selector)];

let currentMode = null;

let difficulty = "hard";

let board = Array(9).fill("");

let turn = "X";

let winner = null;

let winningLine = [];

let mySymbol = "X";

let roomId = null;

let restartReady = false;

let currentUsername =
localStorage.getItem("ttt_username") || "";

let stats = JSON.parse(
localStorage.getItem("ttt_stats") ||
'{"games":0,"wins":0,"losses":0,"draws":0}'
);

// -----------------------------
// INITIAL SETUP
// -----------------------------

if ($("#usernameInput")) {

$("#usernameInput").value =
currentUsername;
}

// -----------------------------
// SCREEN SYSTEM
// -----------------------------

function showScreen(id) {

$$(".screen").forEach(screen => {

```
screen.classList.remove(
  "active"
);
```

});

const screen =
$("#" + id);

if (screen) {

```
screen.classList.add(
  "active"
);
```

}
}

// -----------------------------
// USERNAME
// -----------------------------

function getUsername() {

const value =
$("#usernameInput")
?.value
?.trim()
|| "Player";

currentUsername =
value;

localStorage.setItem(
"ttt_username",
value
);

return value;
}

// -----------------------------
// TOAST
// -----------------------------

function toast(message) {

const element =
$("#toast");

if (!element) {

```
alert(message);

return;
```

}

element.textContent =
message;

element.classList.add(
"show"
);

setTimeout(() => {

```
element.classList.remove(
  "show"
);
```

}, 2400);
}

// -----------------------------
// STATISTICS
// -----------------------------

function saveStats() {

localStorage.setItem(
"ttt_stats",
JSON.stringify(stats)
);
}

function updateStats(result) {

stats.games++;

if (result === "draw") {

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

updateProfile();
}

function updateProfile() {

if (!$("#profileName")) {

```
return;
```

}

$("#profileName").textContent =
currentUsername || "Player";

$("#statGames").textContent =
stats.games;

$("#statWins").textContent =
stats.wins;

$("#statLosses").textContent =
stats.losses;

$("#statDraws").textContent =
stats.draws;

const winRate =
stats.games > 0
? Math.round(
stats.wins /
stats.games *
100
)
: 0;

$("#statWinRate").textContent =
`${winRate}%`;
}

// -----------------------------
// CPU GAME
// -----------------------------

function startCPU(level) {

currentMode =
"cpu";

difficulty =
level;

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

restartReady =
false;

$("#gameModeLabel").textContent =
`CPU MATCH • ${level.toUpperCase()}`;

$("#playerXName").textContent =
getUsername();

$("#playerOName").textContent =
"CPU";

showScreen(
"gameScreen"
);

render();
}

// -----------------------------
// CPU MOVE
// -----------------------------

function getAvailableMoves() {

return board
.map((value, index) =>
value === ""
? index
: null
)
.filter(
index =>
index !== null
);
}

function getRandomMove() {

const available =
getAvailableMoves();

if (!available.length) {

```
return null;
```

}

return available[
Math.floor(
Math.random() *
available.length
)
];
}

function findWinningMove(symbol) {

const available =
getAvailableMoves();

for (
const index of available
) {

```
board[index] =
  symbol;

const result =
  checkWinner(board);

board[index] =
  "";

if (
  result.winner === symbol
) {

  return index;
}
```

}

return null;
}

function getSmartMove() {

// 1. CPU can win
const winningMove =
findWinningMove("O");

if (
winningMove !== null
) {

```
return winningMove;
```

}

// 2. Block player
const blockingMove =
findWinningMove("X");

if (
blockingMove !== null
) {

```
return blockingMove;
```

}

// 3. Center
if (
board[4] === ""
) {

```
return 4;
```

}

// 4. Corners
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
    Math.random() *
    corners.length
  )
];
```

}

// 5. Any empty square
return getRandomMove();
}

function getCPUMove() {

// EASY
if (
difficulty === "easy"
) {

```
return getRandomMove();
```

}

// MEDIUM
if (
difficulty === "medium"
) {

```
// Medium makes mistakes often enough
// for the player to beat it.
if (
  Math.random() < 0.4
) {

  return getRandomMove();
}

return getSmartMove();
```

}

// HARD
if (
difficulty === "hard"
) {

```
// Hard is very strong but not perfect.
// This gives the player a real chance.
if (
  Math.random() < 0.15
) {

  return getRandomMove();
}

return getSmartMove();
```

}

return getRandomMove();
}

function makeCPUMove() {

if (
currentMode !== "cpu"
||
winner
||
turn !== "O"
) {

```
return;
```

}

const move =
getCPUMove();

if (
move === null
) {

```
return;
```

}

board[move] =
"O";

const result =
checkWinner(board);

if (
result.winner
) {

```
winner =
  result.winner;

winningLine =
  result.line;

updateStats(
  winner
);
```

} else {

```
turn =
  "X";
```

}

render();
}

// -----------------------------
// BOARD CLICK
// -----------------------------

function handleCellClick(index) {

if (
winner
||
board[index]
) {

```
return;
```

}

// CPU GAME
if (
currentMode === "cpu"
) {

```
if (
  turn !== "X"
) {

  return;
}

board[index] =
  "X";

const result =
  checkWinner(board);

if (
  result.winner
) {

  winner =
    result.winner;

  winningLine =
    result.line;

  updateStats(
    winner
  );

} else {

  turn =
    "O";

  render();

  setTimeout(
    makeCPUMove,
    500
  );

  return;
}

render();

return;
```

}

// ONLINE GAME
if (
currentMode === "online"
) {

```
if (
  turn !== mySymbol
) {

  toast(
    "It is not your turn."
  );

  return;
}

socket.emit(
  "move",
  index
);
```

}
}

// -----------------------------
// RENDER BOARD
// -----------------------------

function render() {

$$(".cell").forEach(
(cell, index) => {

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

  const disabled =
    Boolean(
      board[index]
    )
    ||
    Boolean(
      winner
    )
    ||
    (
      currentMode === "cpu"
      &&
      turn !== "X"
    )
    ||
    (
      currentMode === "online"
      &&
      turn !== mySymbol
    );

  cell.disabled =
    disabled;
}
```

);

if (
$("#playerX")
) {

```
$("#playerX")
  .classList
  .toggle(
    "active",
    turn === "X"
    &&
    !winner
  );
```

}

if (
$("#playerO")
) {

```
$("#playerO")
  .classList
  .toggle(
    "active",
    turn === "O"
    &&
    !winner
  );
```

}

if (
winner === "draw"
) {

```
$("#statusText").textContent =
  "Draw!";
```

} else if (
winner
) {

```
$("#statusText").textContent =
  `Player ${winner} Wins!`;
```

} else if (
currentMode === "cpu"
) {

```
$("#statusText").textContent =
  turn === "X"
    ? "Your turn"
    : "CPU is thinking...";
```

} else if (
currentMode === "online"
) {

```
$("#statusText").textContent =
  turn === mySymbol
    ? "Your turn"
    : "Opponent's turn";
```

}
}

// -----------------------------
// ONLINE GAME
// -----------------------------

function startOnlineGame() {

currentMode =
"online";

board =
Array(9).fill("");

turn =
"X";

winner =
null;

winningLine =
[];

restartReady =
false;

$("#gameModeLabel").textContent =
"ONLINE MATCH";

showScreen(
"gameScreen"
);

render();
}

function updateOnlinePlayers(players) {

if (!players) {

```
return;
```

}

Object.entries(
players
).forEach(
([id, player]) => {

```
  if (
    id === socket.id
  ) {

    mySymbol =
      player.symbol;

    $("#playerXName").textContent =
      player.symbol === "X"
        ? player.username
        : "Opponent";

    $("#playerOName").textContent =
      player.symbol === "O"
        ? player.username
        : "Opponent";
  }
}
```

);

const playerList =
Object.values(
players
);

const xPlayer =
playerList.find(
player =>
player.symbol === "X"
);

const oPlayer =
playerList.find(
player =>
player.symbol === "O"
);

if (
xPlayer
) {

```
$("#playerXName").textContent =
  xPlayer.username;
```

}

if (
oPlayer
) {

```
$("#playerOName").textContent =
  oPlayer.username;
```

}
}

// -----------------------------
// RESTART
// -----------------------------

function restartGame() {

if (
currentMode === "online"
) {

```
if (
  restartReady
) {

  toast(
    "You are already ready."
  );

  return;
}

restartReady =
  true;

socket.emit(
  "requestRestart"
);

return;
```

}

board =
Array(9).fill("");

turn =
"X";

winner =
null;

winningLine =
[];

render();
}

// -----------------------------
// BUTTON EVENTS
// -----------------------------

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

$("#profileBtn")
?.addEventListener(
"click",
() => {

```
  updateProfile();

  showScreen(
    "profileScreen"
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
"[data-back]"
).forEach(
button => {

```
button.addEventListener(
  "click",
  () => {

    showScreen(
      button.dataset.back
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

    handleCellClick(
      Number(
        cell.dataset.index
      )
    );
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

$("#restartBottomBtn")
?.addEventListener(
"click",
restartGame
);

$("#returnMenuBtn")
?.addEventListener(
"click",
() => {

```
  currentMode =
    null;

  showScreen(
    "menuScreen"
  );
}
```

);

$("#gameMenuBtn")
?.addEventListener(
"click",
() => {

```
  currentMode =
    null;

  showScreen(
    "menuScreen"
  );
}
```

);

// -----------------------------
// QUICK MATCH
// -----------------------------

$("#quickMatchBtn")
?.addEventListener(
"click",
() => {

```
  const name =
    getUsername();

  socket.emit(
    "quickMatch",
    {
      username: name
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

// -----------------------------
// PRIVATE ROOM
// -----------------------------

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
  const code =
    $("#roomCodeInput")
      .value
      .trim()
      .toUpperCase();

  if (
    code.length !== 5
  ) {

    toast(
      "Enter a valid room code."
    );

    return;
  }

  socket.emit(
    "joinPrivateRoom",
    {
      username:
        getUsername(),

      roomId:
        code
    }
  );
}
```

);

$("#copyRoomBtn")
?.addEventListener(
"click",
async () => {

```
  if (
    !roomId
  ) {

    return;
  }

  await navigator
    .clipboard
    .writeText(
      roomId
    );

  toast(
    "Room code copied."
  );
}
```

);

// -----------------------------
// SOCKET EVENTS
// -----------------------------

socket.on(
"privateRoomCreated",
data => {

```
roomId =
  data.roomId;

$("#roomCodeDisplay")
  .textContent =
  roomId;

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

startOnlineGame();
```

}
);

socket.on(
"state",
state => {

```
if (
  state.roomId
) {

  roomId =
    state.roomId;
}

if (
  currentMode !== "online"
  &&
  Object.keys(
    state.players || {}
  ).length > 0
) {

  startOnlineGame();
}

board =
  state.board;

turn =
  state.turn;

winner =
  state.winner;

winningLine =
  state.winningLine || [];

updateOnlinePlayers(
  state.players
);

if (
  winner
  &&
  currentMode === "online"
) {

  if (
    winner === "draw"
    ||
    winner === mySymbol
    ||
    winner !== mySymbol
  ) {

    updateStats(
      winner
    );
  }
}

if (
  !winner
) {

  restartReady =
    false;
}

render();
```

}
);

socket.on(
"restartStatus",
data => {

```
restartReady =
  true;

$("#statusText")
  .textContent =
  `${data.ready}/${data.total} Ready`;
```

}
);

socket.on(
"opponentDisconnected",
() => {

```
toast(
  "Opponent disconnected."
);

$("#statusText")
  .textContent =
  "Opponent disconnected";
```

}
);

socket.on(
"errorMessage",
message => {

```
toast(
  message
);
```

}
);

window.addEventListener(
"socketError",
() => {

```
toast(
  "Could not connect to server."
);
```

}
);

// -----------------------------
// SETTINGS
// -----------------------------

$("#themeSelect")
?.addEventListener(
"change",
event => {

```
  document.body
    .classList
    .toggle(
      "darker",
      event.target.value ===
      "darker"
    );
}
```

);

updateProfile();
