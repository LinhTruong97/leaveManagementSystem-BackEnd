const express = require("express");
const authController = require("../controllers/auth.controllers");
const validators = require("../middlewares/validators");
const router = express.Router();
const { body, param } = require("express-validator");

/**
 * @route POST /auth/login
 * @description Log in with email and password
 * @body {email, passsword}
 * @access Public
 */
router.post(
  "/login",
  validators.validate([
    body("email")
      .trim()
      .exists()
      .withMessage("Email is required")
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("password")
      .trim()
      .exists()
      .notEmpty()
      .withMessage("Password is required"),
  ]),
  authController.login
);

/**
 * @route PUT /auth/accountsetup/:userId
 * @description Set up account
 * @body {userName, email, passsword}
 * @access Public
 */
router.put(
  "/accountsetup/:userId",
  validators.validate([
    param("userId").exists().isString().custom(validators.checkObjectId),
    body("userName", "User Name is required").trim().exists().notEmpty(),
    body("email")
      .trim()
      .exists()
      .withMessage("Email is required")
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("password")
      .trim()
      .exists()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 5 })
      .withMessage("Password is at least 5 characters"),
  ]),
  authController.accountSetup
);

module.exports = router;
