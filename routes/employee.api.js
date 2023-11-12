const express = require("express");
const employeeController = require("../controllers/employee.controllers");
const router = express.Router();
const { body, param } = require("express-validator");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const authorization = require("../middlewares/authorization");
const { ADMIN_OFFICE, EMPLOYEE, MANAGER } = require("../variables/constants");

/**
 * @route POST /employees
 * @description Create a new employee
 * @body { fullName, email, role, reportTo, birthday}
 * @access  Login required, limit access by role (admin office)
 */
router.post(
  "/",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    body("fullName", "Full Name is required").trim().exists().notEmpty(),
    body("email")
      .trim()
      .exists()
      .withMessage("Email is required")
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("role")
      .exists()
      .notEmpty()
      .withMessage("Role is required")
      .isIn([ADMIN_OFFICE, MANAGER, EMPLOYEE])
      .withMessage("Role value is invalid"),
    body("reportTo").exists().isString().custom(validators.checkObjectId),
    body("birthday").isISO8601().withMessage("Birthday wrong format"),
  ]),
  employeeController.createNewEmployee
);

/**
 * @route GET /employees?page=1?&limit=10
 * @description Get the list of full employees
 * @access Login required, limit access by role
 */
router.get(
  "/",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE, MANAGER]),
  employeeController.getEmployees
);

/**
 * @route GET /employees/report-to
 * @description Get the list of full reportTo employees
 * @access Login required, limit access by role (admin office)
 */
router.get(
  "/report-to",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  employeeController.getReportToEmployees
);

/**
 * @route GET /employees/:employeeId
 * @description Get specific employee
 * @access Login required, limit access by role (admin office, manager)
 */
router.get(
  "/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE, MANAGER]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.getSingleEmployee
);

/**
 * @route PUT /employees/update/:employeeId
 * @description Update an employee's profile
 * @body { userName ,fullName, email, role, reportTo, gender, phone, address, birthday}
 * @access Login required, limit access by role (admin office)
 */
router.put(
  "/update/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
    body("userName", "Full Name is required").trim().exists().notEmpty(),
    body("fullName", "Full Name is required").trim().exists().notEmpty(),
    body("email")
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("role")
      .isIn([ADMIN_OFFICE, MANAGER, EMPLOYEE])
      .withMessage("Role value is invalid"),
    body("reportTo").optional().isString().custom(validators.checkObjectId),
    body("gender")
      .isIn(["Male", "Female", "Other"])
      .withMessage("Gender value is invalid"),
    body("phone")
      .isString()
      .isLength({ min: 10, max: 11 })
      .withMessage("Phone number is invalid"),
    body("address")
      .trim()
      .exists()
      .notEmpty()
      .withMessage("Address is required"),
    body("birthday")
      .optional()
      .isISO8601()
      .withMessage("Birthday wrong format"),
  ]),
  employeeController.updateEmployee
);

/**
 * @route PUT /employees/terminate/:employeeId
 * @description Terminate an employee
 * @access Login required, limit access by role (admin office)
 */
router.put(
  "/terminate/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.terminateEmployee
);

/**
 * @route PUT /employees/reactivate/:employeeId
 * @description Reactivate an employee
 * @access Login required, limit access by role (admin office)
 */
router.put(
  "/reactivate/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.reactivateEmployee
);

/**
 * @route DELETE /employees/delete/:employeeId
 * @description  Delete an employee
 * @access Login required
 */
router.delete(
  "/delete/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.deleteEmployee
);

module.exports = router;
