const { AppError } = require("../helpers/utils");
const User = require("../models/User");

const authorization = {};

authorization.specificRoleRequired = (roles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate("role");

    if (!roles.includes(user.role.name)) {
      throw new AppError(403, "Access denied", "Authentication Error");
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authorization;
