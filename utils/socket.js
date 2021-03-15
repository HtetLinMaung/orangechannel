let io;

module.exports = {
  initSocketIO(server) {
    io = require("socket.io")(server, {
      cors: {
        origin: "*",
      },
    });
    return io;
  },
  getSocketIO() {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }

    return io;
  },
};
