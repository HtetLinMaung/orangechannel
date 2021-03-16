require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSocketIO } = require("./utils/socket");
let { users, cacheEvents } = require("./data");
const { addLog, broadcastToSubscribers } = require("./utils/helpers");
const uuid = require("uuid");
const bcrypt = require("bcryptjs");
const moment = require("moment");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);
const io = initSocketIO(server);

io.on("connection", (socket) => {
  socket.emit("onConnected", (socketId) => {
    socket.join(socketId);
  });

  socket.on("init", (data, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    if (!data.hasOwnProperty("users") || typeof data.users != "array") {
      return cb({ code: 422, message: "Unprocessable Entity" });
    }

    for (const user of data.users) {
      for (const key of ["userId", "username", "password"]) {
        if (!Object.keys(user).includes(key)) {
          return cb({ code: 422, message: "Unprocessable Entity" });
        }
      }
    }

    users = [...data.users];

    data.schedules.forEach(({ action, delay, sockets, date }) => {
      const newDelay =
        delay * 1000 + moment(date).valueOf() - moment().valueOf();
      setTimeout(() => {
        if (sockets.length) {
          io.to(sockets).emit(action.event, action.payload);
        } else {
          io.emit(action.event, action.payload);
        }
        addLog(
          `Event ${action.event} emitted to ${sockets} with payload ${action.payload}`
        );
        cacheEvents.push({ type: action.event, payload: action.payload });
      }, newDelay);
    });

    cb({ code: 200, users });
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

  socket.on("sync", (sockets, payload, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    if (typeof sockets != "array") {
      return cb({ code: 422, message: "Unprocessable Entity" });
    }

    io.to(sockets).emit("sync", payload);
    addLog(`Syncing data to ${sockets}`);
    cacheEvents.push({ type: "sync", payload });
    cb({ code: 200, message: "Success" });
  });

  socket.on("custom", (action, { delay = 0, sockets = [] }, cb = () => {}) => {
    if (typeof cb != "function") {
      return socket.disconnect();
    }
    try {
      setTimeout(() => {
        if (sockets.length) {
          io.to(sockets).emit(action.event, action.payload);
        } else {
          io.emit(action.event, action.payload);
        }
        addLog(
          `Event ${action.event} emitted to ${sockets} with payload ${action.payload}`
        );
        cacheEvents.push({ type: action.event, payload: action.payload });
        cb({ code: 200, message: "Custom event emitted" });
      }, delay * 1000);
    } catch (err) {
      cb({ code: 500, message: "Server Error!" });
    }
  });

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
