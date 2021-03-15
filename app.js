require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSocketIO } = require("./utils/socket");
let { users, rooms } = require("./data");
const { addLog, emit } = require("./utils/helpers");
const uuid = require("uuid");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);
const io = initSocketIO(server);

io.on("connection", (socket) => {
  // socket.on("newRoom", (name) => {
  //   const roomId = uuid.v4();
  //   rooms.push({ id: roomId, name, users: [] });
  //   addLog(`Room ${name} created`);
  //   emit(roomId, "newRoom", rooms);
  // });

  socket.on("join", ({ userId, username, roomId }) => {
    const room = rooms.find((v) => v.id == roomId);
    if (room) {
      socket.join(roomId);
      addLog(`${username || "a user"} connected to ${room.name}`);
      room.users.push({
        userId,
        username,
        room,
      });
      emit(
        roomId,
        "userConnected",
        users.filter((user) => user.roomId == roomId)
      );
    }
  });

  socket.on("leave", (userId, roomId) => {
    const room = rooms.find((v) => v.id == roomId);
    const user = room.users.find((v) => v.userId == userId);

    if (user && room) {
      addLog(`${user.username || "a user"} disconnected from ${room.name}`);
      room.users = room.users.filter((user) => user.userId != userId);
      socket.leave(roomId);

      emit(
        roomId,
        "userDisconnected",
        users.filter((user) => user.roomId == roomId)
      );
    }
  });

  socket.on("sync", (roomId, payload) => {
    const room = rooms.find((v) => v.id == roomId);
    addLog(`Syncing data to ${room.name}`);
    emit(roomId, "sync", payload);
  });

  socket.on("disconnect", (socket) => {
    addLog(socket);
  });
});

app.use("/api/v1/socket", require("./routes/socket-routes"));
app.use("/api/v1", require("./routes/data-routes"));
