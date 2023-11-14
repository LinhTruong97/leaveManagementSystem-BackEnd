const { AppError, catchAsync, sendResponse } = require("../helpers/utils");

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

module.exports = notificationController;
