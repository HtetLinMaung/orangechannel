require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSocketIO } = require("./utils/socket");
let { users } = require("./data");
const { addLog } = require("./utils/helpers");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT}`)
);
const io = initSocketIO(server);

io.on("connection", (socket) => {
  addLog("a user connected");
  users.push(socket.id);
  io.emit("userConnected", users);

  socket.on("disconnect", (socket) => {
    addLog("a user disconnected");
    users = users.filter((user) => user != socket.id);
    io.emit("userDisconnected", users);
  });
});

app.use("/api/v1/socket", require("./routes/socket-routes"));
