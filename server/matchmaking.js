let waitingPlayer = null;

function addPlayer(socket) {
  if (!waitingPlayer) {
    waitingPlayer = socket;
    return null;
  }

  const opponent = waitingPlayer;
  waitingPlayer = null;
  return opponent;
}

function removePlayer(socket) {
  if (waitingPlayer === socket) waitingPlayer = null;
}

module.exports = { addPlayer, removePlayer };
