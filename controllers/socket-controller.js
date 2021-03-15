const { getSocketIO } = require("../utils/socket");
let { subscribers, cacheEvents } = require("../data");
const uuid = require("uuid");
const { addLog } = require("../utils/helpers");

exports.subscribe = (req, res) => {
  const id = uuid.v4();
  subscribers.push({
    id,
    url: req.body.url,
    name: req.body.name,
    headers: req.body.headers || {},
    type: req.body.type,
    maxTry: req.body.maxTry,
    failCount: 0,
  });
  addLog(`Server ${req.body.name} subscribed`);
  res.json({ message: "Success", id });
};

exports.unSubscribe = (req, res) => {
  const server = subscribers.find((v) => v.id == req.params.id);
  subscribers = subscribers.filter((v) => v.id != req.params.id);
  addLog(`Server ${server.name} unsubscribed`);
  res.status(204);
};

exports.send = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    if (req.query.room) {
      io.to(req.query.room).send(req.body);
    } else {
      io.send(req.body);
    }
    cacheEvents.push({ type: "message", payload: req.body });
    addLog("message event emited");
  }, (req.query.delay || 0) * 1000);
  res.json({ message: "Success" });
};

exports.sendEvent = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    io.emit(req.params.event);
    cacheEvents.push({ type: req.params.event, payload: {} });
    addLog(`${req.params.event} event emited`);
  }, (req.query.delay || 0) * 1000);
  res.json({ message: "Success" });
};

exports.emit = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    if (req.query.room) {
      io.to(req.query.room).emit(req.params.event, req.body);
    } else {
      io.emit(req.params.event, req.body);
    }

    cacheEvents.push({ type: req.params.event, payload: req.body });
    addLog(
      `${req.params.event} event emited with payload ${JSON.stringify(
        req.body
      )}`
    );
  }, (req.query.delay || 0) * 1000);

  res.json({ message: "Success" });
};
