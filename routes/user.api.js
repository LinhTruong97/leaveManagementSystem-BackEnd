const express = require("express");
const authentication = require("../middlewares/authentication");
const userController = require("../controllers/user.controllers");
const validators = require("../middlewares/validators");
const { body, param } = require("express-validator");

const router = express.Router();

/**
 * @route GET /users/me
 * @description Get current user info
 * @body
 * @access Login required
 */
router.get("/me", authentication.loginRequired, userController.getCurrentUser);

/**
 * @route PUT /users/:userId
 * @description  Update user profile
 * @body {userName, gender, phone, address, avatarUrl}
 * @access Login required
 */
router.put(
  "/:userId",
  authentication.loginRequired,
  validators.validate([
    param("userId").exists().isString().custom(validators.checkObjectId),
    body("gender")
      .optional()
      .isIn(["male", "female", "other"])
      .withMessage("Gender value is invalid"),
    body("phone")
      .optional()
      .isString()
      .isLength({ min: 10, max: 11 })
      .withMessage("Phone number is invalid"),
  ]),
  userController.updateProfile
);

module.exports = router;
