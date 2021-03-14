const { getSocketIO } = require("../utils/socket");
let { subscribers, logs } = require("../data");
const uuid = require("uuid");
const { addLog } = require("../utils/helpers");

exports.subscribe = (req, res) => {
  const id = uuid.v4();
  subscribers.push({
    id,
    url: req.body.url,
    headers: req.body.headers || {},
    type: req.body.type,
    maxTry: req.body.maxTry,
    failCount: 0,
  });
  addLog("a server subscribed");
  res.json({ message: "Success", id, logs });
};

exports.unSubscribe = (req, res) => {
  subscribers = subscribers.filter((v) => v.id != req.params.id);
  addLog("a server unsubscribed");
  res.status(204);
};

exports.send = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    io.send(req.body);
    addLog("message event emited");
  }, (req.query.delay || 0) * 1000);
  res.json({ message: "Success" });
};

exports.sendEvent = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    io.emit(req.params.event);
    addLog(`${req.params.event} event emited`);
  }, (req.query.delay || 0) * 1000);
  res.json({ message: "Success" });
};

exports.emit = (req, res) => {
  const io = getSocketIO();
  setTimeout(() => {
    io.emit(req.params.event, req.body);
    addLog(
      `${req.params.event} event emited with payload ${JSON.stringify(
        req.body
      )}`
    );
  }, (req.query.delay || 0) * 1000);

  res.json({ message: "Success" });
};
