const express = require("express");
const {
  fetchAllEvents,
  fetchAllLogs,
  fetchAllRooms,
  fetchRoomById,
  createRoom,
  deleteRoom,
} = require("../controllers/data-controller");
const router = express.Router();

router.get("/events", fetchAllEvents);

router.route("/rooms").get(fetchAllRooms).post(createRoom);

router.delete("/rooms/:id", deleteRoom);

router.get("/rooms/:id", fetchRoomById);

router.get("/logs", fetchAllLogs);

module.exports = router;
