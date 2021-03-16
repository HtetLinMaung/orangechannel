require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSocketIO } = require("./utils/socket");
let { users, rooms, cacheEvents } = require("./data");
const { addLog, emit, broadcastToSubscribers } = require("./utils/helpers");
const uuid = require("uuid");
const bcrypt = require("bcrypt");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);
const io = initSocketIO(server);

io.on("connection", (socket) => {
  socket.emit("onConnected", (userId) => {
    socket.join(userId);
  });

  socket.on("init", (data, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    if (
      !data.hasOwnProperty("users") ||
      typeof data.users != "array" ||
      !data.hasOwnProperty("rooms") ||
      typeof data.rooms != "array"
    ) {
      return cb({ code: 422, message: "Unprocessable Entity" });
    }

    for (const user of data.users) {
      for (const key of ["userId", "username", "password"]) {
        if (!Object.keys(user).includes(key)) {
          return cb({ code: 422, message: "Unprocessable Entity" });
        }
      }
    }

    for (const room of data.rooms) {
      for (const key of ["roomId", "roomName", "users"]) {
        if (!Object.keys(room).includes(key)) {
          return cb({ code: 422, message: "Unprocessable Entity" });
        }
      }
      if (typeof room.users != "array") {
        return cb({ code: 422, message: "Unprocessable Entity" });
      }
    }

    users = [...data.users];
    rooms = [...data.rooms];
    cb({ code: 200, users, rooms });
  });

  socket.on("newRoom", (roomName, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    const roomId = uuid.v4();
    rooms.push({ roomId, roomName, users: [] });
    addLog(`Room ${roomName} created`);
    cb({ code: 201, roomId });
    io.emit("newRoom", rooms);
  });

  socket.on("deleteRoom", (roomId, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    const room = rooms.find((v) => v.roomId == roomId);
    if (!room) {
      return cb({ code: 404, message: "Not Found" });
    }
    addLog(`Room ${room.roomName} removed`);
    cb({ code: 204, message: "Deleted" });
    io.emit("deleteRoom", rooms);
  });

  socket.on(
    "newUser",
    async (user, { encryptPassword = true }, cb = () => {}) => {
      if (typeof cb != "function") {
        return socket.disconnect();
      }
      if (
        !user.hasOwnProperty("username") ||
        !user.hasOwnProperty("password")
      ) {
        return cb({ code: "422", message: "Unprocessable Entity!" });
      }
      const userId = uuid.v4();
      let hashedPwd = encryptPassword
        ? await bcrypt.hash(user.password, 12)
        : user.password;

      const newUser = {
        ...user,
        username: user.username,
        userId,
        password: hashedPwd,
      };
      users.push(newUser);
      cb({ code: "201", user: newUser });
    }
  );

  // must call from client
  socket.on("join", (roomId, userId, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    const room = rooms.find((v) => v.roomId == roomId);
    const user = users.find((v) => v.userId == userId);
    if (!room || !user) {
      return cb({ code: "404", message: "Not Found" });
    }
    socket.join(roomId);
    if (!room.users.find((user) => user.userId == userId)) {
      room.users.push(userId);
    }
    addLog(`${user.username || "a user"} disconnected from ${room.roomName}`);
    io.emit("userConnected", rooms);
    cb({ code: 200, message: "Joined" });
  });

  // must call from client
  socket.on("leave", (roomId, userId, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    const room = rooms.find((v) => v.roomId == roomId);
    const user = users.find((v) => v.userId == userId);

    if (!room || !user) {
      return cb({ code: 404, message: "Not Found" });
    }
    socket.leave(roomId);
    room.users = room.users.filter((u) => u.userId != userId);
    io.emit("userDisconnected", rooms);
    cacheEvents.push({
      type: "userDisconnected",
      payload: rooms,
    });
    cb({ code: 200, message: "Leaved" });
  });

  socket.on("sync", (roomId, payload) => {
    const room = rooms.find((v) => v.roomId == roomId);
    addLog(`Syncing data to ${room.roomName}`);
    emit(roomId, "sync", payload);
  });

  socket.on(
    "custom",
    (action, { delay = 0, roomId = null, date }, cb = () => {}) => {
      if (typeof cb != "function") {
        return socket.disconnect();
      }
      try {
        setTimeout(() => {
          if (roomId != null) {
            io.to(roomId).emit(action.event, action.payload);
          } else {
            io.emit(action.event, action.payload);
          }
          addLog(
            `Event ${action.event} emitted ${
              roomId != null ? "to " + roomId : ""
            } with payload ${action.payload}`
          );
          cacheEvents.push({ type: action.event, payload: action.payload });
          cb({ code: 200, message: "Custom event emitted" });
        }, delay * 1000);
      } catch (err) {
        cb({ code: 500, message: "Server Error!" });
      }
    }
  );

  socket.on("broadcast", (payload) => {
    // todo: safe guard broadcast channel
    addLog(`Broadcasting to everyone`);
    io.emit("broadcast", payload);
    const action = { type: "broadcast", payload };
    broadcastToSubscribers("event", action);
    cacheEvents.push(action);
  });

  socket.on("disconnect", (socket) => {
    addLog(socket);
  });
});

app.use("/api/v1/socket", require("./routes/socket-routes"));
app.use("/api/v1", require("./routes/data-routes"));
