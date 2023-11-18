const express = require("express");
const notificationController = require("../controllers/notification.controllers");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const router = express.Router();
const { body } = require("express-validator");

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

// Test send noti
router.post(
  "/send",
  authentication.loginRequired,
  notificationController.sendNotification
);

module.exports = router;
