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
    body("birthday")
      .optional()
      .isISO8601()
      .withMessage("Birthday wrong format"),
  ]),
  employeeController.createNewEmployee
);

/**
 * @route GET /employees/admin?page=1?&limit=10
 * @description Get the list of full employees
 * @access Login required, limit access by role (admin office)
 */
router.get(
  "/admin",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  employeeController.getEmployeesAdmin
);

/**
 * @route GET /employees/manager?page=1?&limit=10
 * @description Get the list of employees incharge
 * @access Login required, limit access by role (manager)
 */
router.get(
  "/manager",
  authentication.loginRequired,
  authorization.specificRoleRequired([MANAGER]),
  employeeController.getEmployeesManager
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
 * @body {userName, fullName, email, role, reportTo, gender, phone, address}
 * @access Login required, limit access by role (admin office)
 */
router.put(
  "/update/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired([ADMIN_OFFICE]),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("role")
      .optional()
      .isIn([ADMIN_OFFICE, MANAGER, EMPLOYEE])
      .withMessage("Role value is invalid"),
    body("reportTo").optional().isString().custom(validators.checkObjectId),
    body("gender")
      .optional()
      .isIn(["Male", "Female", "Other"])
      .withMessage("Gender value is invalid"),
    body("phone")
      .optional()
      .isString()
      .isLength({ min: 10, max: 11 })
      .withMessage("Phone number is invalid"),
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
