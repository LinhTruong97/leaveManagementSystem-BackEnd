const express = require("express");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const leaveController = require("../controllers/leave.controllers");
const authorization = require("../middlewares/authorization");
const { body, param } = require("express-validator");
const { ADMIN_OFFICE, MANAGER } = require("../variables/constants");

const router = express.Router();

/**
 * @route GET /leaves/me?page=1?&limit=5
 * @description Get the list of my leaves
 * @access Login required
 */
router.get(
  "/me",
  authentication.loginRequired,
  leaveController.getCurrentUserLeaves
);

/**
 *
 * @route GET /leaves/admin
 * @description Get the list of leaves full employees
 * @access Login required, limit role (admin office)
 */
router.get(
  "/admin",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  leaveController.getEmployeeLeaveAdmin
);

/**
 * @route GET /leaves/manager
 * @description Get the list of leaves of team member
 * @access Login required, limit role (manager)
 */
router.get(
  "/manager",
  authentication.loginRequired,
  authorization.specificRoleRequired([MANAGER]),
  leaveController.getEmployeeLeaveManager
);

/**
 * @route GET /leaves/pending
 * @description Get the list of pending leaves
 * @access Login required
 */
router.get(
  "/pending",
  authentication.loginRequired,
  leaveController.getPendingLeave
);

/**
 * @route GET /leaves/:requestId
 * @description Get a leave request
 * @access Login required
 */
router.get(
  "/:requestId",
  authentication.loginRequired,
  validators.validate([
    param("requestId").exists().isString().custom(validators.checkObjectId),
  ]),
  leaveController.getSingleLeave
);

/**
 * @route GET /leaves/balance/me
 * @description Get leave balance of current user
 * @access Login required
 */
router.get(
  "/balance/me",
  authentication.loginRequired,
  leaveController.getCurrentUserLeaveBalance
);

/**
 * @route POST /leaves
 * @description Create a leave request
 * @body { categoryName, fromDate, fromType, toDate, toType, reason}
 * @access Login required
 */
router.post(
  "/",
  authentication.loginRequired,
  validators.validate([
    body("categoryName")
      .exists()
      .notEmpty()
      .withMessage("Category is required"),
    body("fromDate")
      .exists()
      .notEmpty()
      .withMessage("From date is required")
      .isISO8601()
      .withMessage("From date wrong format"),
    body("fromType")
      .exists()
      .notEmpty()
      .withMessage("From type is required")
      .isIn(["full", "half_morning", "half_afternoon"])
      .withMessage("From type value is invalid"),
    body("toDate")
      .exists()
      .notEmpty()
      .withMessage("To date is required")
      .isISO8601()
      .withMessage("To date wrong format"),
    body("toType")
      .exists()
      .notEmpty()
      .withMessage("To type is required")
      .isIn(["full", "half_morning", "half_afternoon"])
      .withMessage("To type value is invalid"),
    body("reason").exists().notEmpty().withMessage("Reason is required"),
  ]),
  leaveController.createLeave
);

/**
 * @route PUT /leaves/:requestId
 * @description Update a leave request
 * @body { fromDate, fromType, toDate, toType, reason}
 * @limit only when status is pending
 * @access Login required
 */
router.put(
  "/:requestId",
  authentication.loginRequired,
  validators.validate([
    body("categoryName")
      .exists()
      .notEmpty()
      .withMessage("Category is required"),
    body("fromDate")
      .exists()
      .notEmpty()
      .withMessage("From date is required")
      .isISO8601()
      .withMessage("From date wrong format"),
    body("fromType")
      .exists()
      .notEmpty()
      .withMessage("From type is required")
      .isIn(["full", "half_morning", "half_afternoon"])
      .withMessage("From type value is invalid"),
    body("toDate")
      .exists()
      .notEmpty()
      .withMessage("To date is required")
      .isISO8601()
      .withMessage("To date wrong format"),
    body("toType")
      .exists()
      .notEmpty()
      .withMessage("To type is required")
      .isIn(["full", "half_morning", "half_afternoon"])
      .withMessage("To type value is invalid"),
    body("reason").exists().notEmpty().withMessage("Reason is required"),
    param("requestId").exists().isString().custom(validators.checkObjectId),
  ]),
  leaveController.updateLeave
);

/**
 * @route DELETE /leaves/:requestId
 * @description Delete a leave request
 * @limit only when status is pending
 * @access Login required
 */
router.delete(
  "/:requestId",
  authentication.loginRequired,
  validators.validate([
    param("requestId").exists().isString().custom(validators.checkObjectId),
  ]),
  leaveController.deleteLeave
);

/**
 * @route PUT /leaves/approve/:requestId
 * @description Approve a leave request
 * @limit only when status is pending
 * @access Login required, limit access by role (manager, admin office)
 */
router.put(
  "/approve/:requestId",
  authentication.loginRequired,
  validators.validate([
    param("requestId").exists().isString().custom(validators.checkObjectId),
  ]),
  leaveController.approveLeave
);

/**
 * @route PUT /leaves/reject/:requestId
 * @description Reject a leave request
 * @limit only when status is pending
 * @access Login required, limit access by role (manager, admin office)
 */
router.put(
  "/reject/:requestId",
  authentication.loginRequired,
  validators.validate([
    param("requestId").exists().isString().custom(validators.checkObjectId),
  ]),
  leaveController.rejectLeave
);

module.exports = router;
