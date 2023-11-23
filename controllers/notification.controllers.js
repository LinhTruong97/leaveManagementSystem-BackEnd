const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Notification = require("../models/Notification");
const User = require("../models/User");
const firebaseAdmin = require("../firebaseSetup");

const notificationController = {};

notificationController.getNotifications = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  const page = parseInt(req.query.page) || 1;
  const limit = 5;

  const totalCount = await Notification.countDocuments({
    targetUser: currentUserId,
  });

  const totalPages = Math.ceil(totalCount / limit);
  const offset = limit * (page - 1);

  const notifications = await Notification.find({
    targetUser: currentUserId,
  })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    targetUser: currentUserId,
    isRead: false,
  });

  // Response
  sendResponse(
    res,
    200,
    true,
    { page, notifications, totalPages, unreadCount },
    null,
    "Get Notifications Successfully"
  );
});

notificationController.markReadAll = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  const notifications = await Notification.updateMany(
    {
      targetUser: currentUserId,
    },
    { $set: { isRead: true } },
    { new: true }
  );

  // Response
  sendResponse(
    res,
    201,
    true,
    null,
    null,
    "Mark Read All Notifications Successfully"
  );
});

notificationController.markRead = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const notificationId = req.params.notificationId;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      targetUser: currentUserId,
    },
    { isRead: true },
    { new: true }
  );

  if (!notification)
    throw new AppError(
      400,
      "Notification not found",
      "Mark Read Notification Error"
    );

  // Response
  sendResponse(
    res,
    201,
    true,
    notification,
    null,
    "Mark Read Notification Successfully"
  );
});

notificationController.sendNotification = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentFcmToken = req.currentFcmToken;

  const registrationToken = currentFcmToken;
  const message = {
    notification: {
      title: "Test title",
      body: "Test body",
    },
    token: registrationToken,
  };

  const response = await firebaseAdmin.messaging().send(message);

  // Response
  sendResponse(
    res,
    200,
    true,
    response,
    null,
    "Send Notification Successfully"
  );
});

module.exports = notificationController;
