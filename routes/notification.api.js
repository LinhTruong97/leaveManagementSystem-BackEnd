const express = require("express");
const notificationController = require("../controllers/notification.controllers");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const router = express.Router();
const { param } = require("express-validator");

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

/**
 * @route PUT /notifications/mark-read-all
 * @description Mark all notifications read
 * @access Login required
 */
router.put(
  "/mark-read-all",
  authentication.loginRequired,
  notificationController.markReadAll
);

/**
 * @route PUT /notifications/mark-read/:notificationId
 * @description Mark single notification read
 * @access Login required
 */
router.put(
  "/mark-read/:notificationId",
  authentication.loginRequired,
  validators.validate([
    param("notificationId")
      .exists()
      .isString()
      .custom(validators.checkObjectId),
  ]),
  notificationController.markRead
);

// Test send noti
router.post(
  "/send",
  authentication.loginRequired,
  notificationController.sendNotification
);

module.exports = router;
