const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Notification = require("../models/Notification");
const User = require("../models/User");

const notificationController = {};

notificationController.getNotifications = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  const notifications = await Notification.find({
    targetUser: currentUserId,
  }).sort({ createdAt: -1 });

  // Response
  sendResponse(
    res,
    200,
    true,
    notifications,
    null,
    "Get Notifications Successfully"
  );
});

notificationController.updateFcmToken = catchAsync(async (req, res, next) => {
  const { fcmToken } = req.body;
  const currentUserId = req.userId;

  const user = await User.findById(currentUserId);

  if (!user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens.push(fcmToken);
    await user.save();
  }

  sendResponse(res, 201, true, null, null, "Update Fcm Token Successfully");
});

notificationController.getUnreadNotifications = catchAsync(
  async (req, res, next) => {
    // Get data from request
    const currentUserId = req.userId;

    const notifications = await Notification.find({
      targetUser: currentUserId,
      isRead: false,
    })
      .sort({ createdAt: -1 })
      .limit(10);
    console.log(notifications);

    const unreadCount = await Notification.countDocuments({
      targetUser: currentUserId,
      isRead: false,
    });
    console.log(unreadCount);
    // Response
    sendResponse(
      res,
      200,
      true,
      { notifications, unreadCount },
      null,
      "Get Unread Notifications Successfully"
    );
  }
);

module.exports = notificationController;
