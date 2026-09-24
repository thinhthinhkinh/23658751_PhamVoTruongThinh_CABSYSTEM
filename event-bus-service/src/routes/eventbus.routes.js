const express = require("express");
const {
  subscribeHandler,
  publishHandler,
  listSubscriptionsHandler,
} = require("../controllers/eventbus.controller");

const router = express.Router();

router.post("/subscribe", subscribeHandler);
router.post("/publish", publishHandler);
router.get("/subscriptions", listSubscriptionsHandler);

module.exports = router;
