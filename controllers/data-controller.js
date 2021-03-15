let { logs, cacheEvents, rooms } = require("../data");
const uuid = require("uuid");
const { addLog } = require("../utils/helpers");
const { getSocketIO } = require("../utils/socket");

exports.fetchAllEvents = (req, res) => {
  res.json(cacheEvents);
};

exports.fetchAllRooms = (req, res) => {
  res.json(rooms);
};

exports.fetchRoomById = (req, res) => {
  const room = rooms.find((room) => room.id == req.params.id);
  if (!room) {
    return res.status(404).json({ message: "Not Found!" });
  }
  res.json(room);
};

exports.fetchAllLogs = (req, res) => {
  res.json(logs);
};

exports.createRoom = (req, res) => {
  id = uuid.v4();
  rooms.push({ id, name: req.body.name, users: [] });
  addLog(`Room ${req.body.name} created`);
  getSocketIO().emit("newRoom", rooms);
  res.json({ message: "Room created", roomId: id });
};

exports.deleteRoom = (req, res) => {
  const room = rooms.find((v) => v.id == req.params.id);
  if (!room) {
    return res.status(404).json({ message: "Not found!" });
  }
  addLog(`Room ${room.name} removed`);
  getSocketIO().emit("removeRoom", rooms);
  res.json({ message: "Room removed" });
};
