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

/**
 * @route GET /notifications/unread
 * @description Get all unread notifications
 * @access Login required
 */
router.get(
  "/unread",
  authentication.loginRequired,
  notificationController.getUnreadNotifications
);

/**
 * @route PUT /notifications/fcm-token
 * @description Update fcm token in user db
 * @access Login required
 */
router.put(
  "/fcm-token",
  authentication.loginRequired,
  validators.validate([
    body("fcmToken").exists().notEmpty().withMessage("Fcm token is required"),
  ]),
  notificationController.updateFcmToken
);

module.exports = router;
