const socket = window.gameSocket;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let currentMode = null;
let difficulty = "hard";
let board = Array(9).fill("");
let turn = "X";
let winner = null;
let winningLine = [];
let mySymbol = "X";
let roomId = null;
let currentUsername = localStorage.getItem("ttt_username") || "";
let stats = JSON.parse(localStorage.getItem("ttt_stats") || '{"games":0,"wins":0,"losses":0,"draws":0}');

$("#usernameInput").value = currentUsername;

function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
}

function username() {
  const value = $("#usernameInput").value.trim() || "Player";
  localStorage.setItem("ttt_username", value);
  return value;
}

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2400);
}

function updateStats(result, mySide = "X") {
  stats.games++;
  if (result === "draw") stats.draws++;
  else if (result === mySide) stats.wins++;
  else stats.losses++;
  localStorage.setItem("ttt_stats", JSON.stringify(stats));
}

function updateProfile() {
  const games = stats.games;
  $("#profileName").textContent = currentUsername || "Player";
  $("#statGames").textContent = games;
  $("#statWins").textContent = stats.wins;
  $("#statLosses").textContent = stats.losses;
  $("#statDraws").textContent = stats.draws;
  $("#statWinRate").textContent = games ? Math.round(stats.wins / games * 100) + "%" : "0%";
}

function startCPU(level) {
  currentMode = "cpu";
  difficulty = level;
  board = Array(9).fill("");
  turn = "X";
  winner = null;
  winningLine = [];
  mySymbol = "X";

  $("#gameModeLabel").textContent = `CPU MATCH • ${level.toUpperCase()}`;
  $("#playerXName").textContent = username();
  $("#playerOName").textContent = "CPU";
  showScreen("gameScreen");
  render();
}

function render() {
  $$(".cell").forEach((cell, i) => {
    cell.textContent = board[i];
    cell.className = "cell";
    if (board[i]) cell.classList.add(board[i].toLowerCase());
    if (winningLine.includes(i)) cell.classList.add("win");
    cell.disabled = Boolean(board[i]) || Boolean(winner) || (currentMode === "cpu" && turn !== "X");
  });

  const xPlayer = $("#playerX");
  const oPlayer = $("#playerO");
  xPlayer.classList.toggle("active", turn === "X" && !winner);
  oPlayer.classList.toggle("active", turn === "O" && !winner);

  if (winner === "draw") $("#statusText").textContent = "Draw!";
  else if (winner) $("#statusText").textContent = `Player ${winner} Wins!`;
  else $("#statusText").textContent = currentMode === "cpu"
    ? (turn === "X" ? "Your turn" : "CPU is thinking...")
    : `Player ${turn}'s turn`;
}

function checkWinner(b) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (const line of lines) {
    const [a,b2,c] = line;
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
      return { winner: b[a], line };
    }
  }

  return b.every(Boolean) ? { winner: "draw", line: [] } : { winner: null, line: [] };
}

function makeMove(index, symbol) {
  if (winner || board[index]) return;
  board[index] = symbol;
  const result = checkWinner(board);
  winner = result.winner;
  winningLine = result.line;

  if (winner) {
    updateStats(winner, "X");
  } else {
    turn = symbol === "X" ? "O" : "X";
  }

  render();
}

function available(b) {
  return b.map((v, i) => v ? null : i).filter(v => v !== null);
}

function findWinningMove(b, symbol) {
  for (const i of available(b)) {
    const copy = [...b];
    copy[i] = symbol;
    if (checkWinner(copy).winner === symbol) return i;
  }
  return null;
}

function mediumMove() {
  const win = findWinningMove(board, "O");
  if (win !== null) return win;

  const block = findWinningMove(board, "X");
  if (block !== null) return block;

  if (!board[4]) return 4;

  const corners = [0, 2, 6, 8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

  return available(board)[0];
}

function minimax(b, maximizing) {
  const result = checkWinner(b);
  if (result.winner === "O") return 10;
  if (result.winner === "X") return -10;
  if (result.winner === "draw") return 0;

  const moves = available(b);

  if (maximizing) {
    let best = -Infinity;
    for (const i of moves) {
      b[i] = "O";
      best = Math.max(best, minimax(b, false));
      b[i] = "";
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of moves) {
      b[i] = "X";
      best = Math.min(best, minimax(b, true));
      b[i] = "";
    }
    return best;
  }
}

function hardMove() {
  let bestScore = -Infinity;
  let move = available(board)[0];

  for (const i of available(board)) {
    board[i] = "O";
    const score = minimax(board, false);
    board[i] = "";
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }

  return move;
}

function cpuMove() {
  if (winner) return;

  let move;
  if (difficulty === "easy") {
    const moves = available(board);
    move = moves[Math.floor(Math.random() * moves.length)];
  } else if (difficulty === "medium") {
    move = mediumMove();
  } else {
    move = hardMove();
  }

  setTimeout(() => {
    if (!winner && turn === "O") makeMove(move, "O");
  }, 450);
}

function resetGame() {
  if (currentMode === "cpu") startCPU(difficulty);
  else if (roomId) socket.emit("move", -1);
}

$$(".cell").forEach(cell => {
  cell.addEventListener("click", () => {
    const index = Number(cell.dataset.index);

    if (currentMode === "cpu") {
      if (turn === "X" && !board[index]) {
        makeMove(index, "X");
        if (!winner) cpuMove();
      }
    } else {
      socket.emit("move", index);
    }
  });
});

$("#cpuBtn").onclick = () => showScreen("difficultyScreen");
$("#onlineBtn").onclick = () => showScreen("onlineScreen");
$("#settingsBtn").onclick = () => showScreen("settingsScreen");
$("#profileBtn").onclick = () => {
  updateProfile();
  showScreen("profileScreen");
};

$$("[data-difficulty]").forEach(btn => {
  btn.onclick = () => startCPU(btn.dataset.difficulty);
});

$$("[data-back]").forEach(btn => {
  btn.onclick = () => showScreen(btn.dataset.back);
});

$("#restartBtn").onclick = resetGame;
$("#restartBottomBtn").onclick = resetGame;

$("#returnMenuBtn").onclick = () => {
  if (roomId) socket.emit("cancelSearch");
  roomId = null;
  currentMode = null;
  showScreen("menuScreen");
};

$("#gameMenuBtn").onclick = () => $("#returnMenuBtn").click();

$("#quickMatchBtn").onclick = () => {
  currentMode = "online";
  socket.emit("quickMatch", { username: username() });
  showScreen("waitingScreen");
};

$("#cancelSearchBtn").onclick = () => {
  socket.emit("cancelSearch");
  showScreen("onlineScreen");
};

$("#createRoomBtn").onclick = () => {
  currentMode = "online";
  socket.emit("createPrivateRoom", { username: username() });
};

$("#joinRoomBtn").onclick = () => {
  const code = $("#roomCodeInput").value.trim().toUpperCase();
  if (code.length !== 5) return toast("Enter a valid 5-character room code.");
  currentMode = "online";
  socket.emit("joinPrivateRoom", { username: username(), roomId: code });
};

$("#copyRoomBtn").onclick = async () => {
  await navigator.clipboard.writeText(roomId);
  toast("Room code copied.");
};

$("#soundToggle").onchange = e => localStorage.setItem("ttt_sound", e.target.checked);
$("#animationToggle").onchange = e => document.body.classList.toggle("no-animations", !e.target.checked);
$("#themeSelect").onchange = e => document.body.classList.toggle("darker", e.target.value === "darker");

socket.on("matchSearching", () => showScreen("waitingScreen"));

socket.on("privateRoomCreated", data => {
  roomId = data.roomId;
  $("#roomCodeDisplay").textContent = roomId;
  showScreen("roomScreen");
});

socket.on("matchFound", data => {
  roomId = data.roomId;
  toast("Opponent found!");
});

socket.on("state", state => {
  if (!roomId) roomId = state.roomId;

  board = state.board;
  turn = state.turn;
  winner = state.winner;
  winningLine = state.winningLine;

  const me = state.players[socket.id];
  const opponent = Object.entries(state.players).find(([id]) => id !== socket.id)?.[1];

  if (me) mySymbol = me.symbol;
  $("#playerXName").textContent = Object.values(state.players).find(p => p.symbol === "X")?.username || "Waiting...";
  $("#playerOName").textContent = Object.values(state.players).find(p => p.symbol === "O")?.username || "Waiting...";

  if (winner && winner !== "draw") updateStats(winner, mySymbol);
  if (winner === "draw") updateStats("draw", mySymbol);

  showScreen("gameScreen");
  render();
});

socket.on("opponentDisconnected", () => {
  toast("Opponent disconnected.");
  $("#statusText").textContent = "Opponent disconnected";
});

socket.on("errorMessage", message => toast(message));
socket.on("socketError", () => toast("Connection failed. Is the server running?"));

updateProfile();
