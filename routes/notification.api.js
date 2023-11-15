const express = require("express");
const notificationController = require("../controllers/notification.controllers");
const authentication = require("../middlewares/authentication");
const router = express.Router();

/**
 * @route GET /notifications
 * @description Get all notifications
 * @access Login required
 */
router.get(
  "/",
  authentication.loginRequired,
  notificationController.getNotifications
);

router.put(
  "/fcm-token",
  authentication.loginRequired,
  notificationController.updateFcmToken
);

module.exports = router;
