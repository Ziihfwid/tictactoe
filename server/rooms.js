const rooms = new Map();

function createRoom(roomId) {
  const room = {
    roomId,
    players: {},
    board: Array(9).fill(""),
    turn: "X",
    winner: null,
    winningLine: []
  };
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
}

module.exports = { rooms, createRoom, getRoom, deleteRoom };
