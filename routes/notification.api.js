const express = require("express");
const notificationController = require("../controllers/notification.controllers");
const router = express.Router();

/**
 * @route GET /notifications
 * @description Get all notifications
 * @access Login required
 */
router.get("/", notificationController.getNotifications);

module.exports = router;
