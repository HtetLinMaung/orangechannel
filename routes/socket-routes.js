const express = require("express");
const {
  sendEvent,
  send,
  emit,
  subscribe,
  unSubscribe,
} = require("../controllers/socket-controller");
const router = express.Router();

router.get("/send-event/:event", sendEvent);

router.post("/send", send);

router.post("/emit/:event", emit);

router.post("/subscribe", subscribe);

router.delete("/un-subscribe", unSubscribe);

module.exports = router;
