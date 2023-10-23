const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const User = require("../models/User");

const userController = {};

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Business Logic Validation - Process
  const user = await User.findById(currentUserId);
  if (!user)
    throw new AppError(400, "User not found", "Get Current User Error");

  // Response
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get Current User Successfully"
  );
});

userController.updateProfile = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const updatedUserId = req.params.userId;
  const { userName } = req.body;

  // Business Logic Validation
  if (currentUserId !== updatedUserId)
    throw new AppError(400, "Permission required", "Update User Error");

  let updatedUser = await User.findById(updatedUserId);
  if (!updatedUser)
    throw new AppError(400, "User not found", "Update User Error");

  const userSameName = await User.findOne({ userName });
  if (userSameName && userSameName._id !== updatedUserId)
    throw new AppError(
      400,
      "User Name has been already taken",
      "Update User Error"
    );

  // Process
  const allows = ["userName", "gender", "phone", "address", "avatarUrl"];
  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      updatedUser[field] = req.body[field];
    }
  });
  await updatedUser.save();
  // Response
  return sendResponse(
    res,
    200,
    true,
    updatedUser,
    null,
    "Update User Successfully"
  );
});

module.exports = userController;
