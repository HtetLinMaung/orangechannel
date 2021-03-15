let { logs, subscribers, cacheEvents } = require("../data");
const moment = require("moment");
const uuid = require("uuid");
const axios = require("axios");
const { getSocketIO } = require("./socket");

exports.addLog = (message, type = "normal") => {
  const timestamp = new Date().toISOString();
  const id = uuid.v4();
  const log = `[${moment(timestamp)}] ${type} "${message}" ${id}`;
  logs.push({ id, message, timestamp, type, log });
  console.log(log);
  this.broadcastToSubscribers("log", {
    id,
    message,
    timestamp,
    type,
    log,
  });
  return log;
};

exports.broadcastToSubscribers = (type, data) => {
  subscribers = subscribers.filter((v) => v.failCount < v.maxTry);
  for (const subscriber of subscribers.filter((v) => v.type == type)) {
    axios
      .post(subscriber.url, data, { headers: subscriber.headers })
      .catch((err) => {
        subscriber.failCount++;
        const timestamp = new Date().toISOString();
        const id = uuid.v4();
        const log = `[${moment(timestamp)}] error "${err.message}" ${id}`;
        logs.push({
          id,
          message: err.message,
          timestamp,
          type: "error",
          log,
        });
        console.log(log);
      });
  }
};

exports.emit = (roomId, event, payload) => {
  getSocketIO().to(roomId).emit(event, payload);
  const action = { type: event, payload, roomId };
  cacheEvents.push(action);
  this.broadcastToSubscribers("event", action);
};
