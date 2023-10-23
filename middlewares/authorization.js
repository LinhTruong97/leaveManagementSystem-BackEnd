const { AppError } = require("../helpers/utils");
const User = require("../models/User");

const authorization = {};

authorization.specificRoleRequired = (role) => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate("role");
    if (user.role.name !== role) {
      throw new AppError(403, "Access denied", "Authentication Error");
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authorization;
