const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const authController = {};

authController.login = catchAsync(async (req, res, next) => {
  // Get data from request
  const { email, password } = req.body;

  // Business Logic Validation
  const user = await User.findOne({ email }, "+password");
  if (!user) throw new AppError(400, "Invalid Email", "Login Error");

  // Process
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(400, "Wrong password", "Login Error");
  const accessToken = await user.generateToken();

  // Response
  sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Login Successfully"
  );
});
authController.accountSetup = catchAsync(async (req, res, next) => {
  // Get data from request
  const userId = req.params.userId;
  let { userName, email, password } = req.body;

  // Business Logic Validation
  let user = await User.findById(userId);
  if (!user) throw new AppError(400, "Not found", "Setup Account Error");
  if (user.email !== email)
    throw new AppError(400, "Invalid Email", "Setup Account Error");
  if (user.status !== "pending")
    throw new AppError(400, "Already set up account", "Setup Account Error");

  const userSameName = await User.findOne({ userName });
  if (userSameName)
    throw new AppError(
      400,
      "User Name has been already taken",
      "Setup Account Error"
    );

  // Process
  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);
  user.userName = userName;
  user.password = password;
  user.status = "active";
  await user.save();

  // const accessToken = await user.generateToken();

  // Response
  sendResponse(res, 200, true, user, null, "Setup Account Successfully");
});
module.exports = authController;
