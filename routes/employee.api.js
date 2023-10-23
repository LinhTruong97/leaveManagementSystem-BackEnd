const express = require("express");
const employeeController = require("../controllers/employee.controllers");
const router = express.Router();
const { body, param } = require("express-validator");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const authorization = require("../middlewares/authorization");

/**
 * @route POST /employees
 * @description Create a new employee
 * @body { fullName, email, role, reportTo}
 * @access  Login required, limit access by role (admin office)
 */
router.post(
  "/",
  authentication.loginRequired,
  authorization.specificRoleRequired("admin office"),
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
      .isIn([1, 2, 3])
      .withMessage("Role value is invalid"),
    body("reportTo").exists().isString().custom(validators.checkObjectId),
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
  authorization.specificRoleRequired("admin office"),
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
  authorization.specificRoleRequired("manager"),
  employeeController.getEmployeesManager
);

/**
 * @route GET /employees/admin/:employeeId
 * @description Get specific employee
 * @access Login required, limit access by role (admin office)
 */
router.get(
  "/admin/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired("admin office"),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.getSingleEmployeeAdmin
);

/**
 * @route GET /employees/manager/:employeeId
 * @description Get specific employee
 * @access Login required, limit access by role (manager)
 */
router.get(
  "/manager/:employeeId",
  authentication.loginRequired,
  authorization.specificRoleRequired("manager"),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.getSingleEmployeeManager
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
  authorization.specificRoleRequired("admin office"),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage("Invalid email"),
    body("role")
      .optional()
      .isIn(["employee", "manager", "admin office"])
      .withMessage("Role value is invalid"),
    body("reportTo").optional().isString().custom(validators.checkObjectId),
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
  authorization.specificRoleRequired("admin office"),
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
  authorization.specificRoleRequired("admin office"),
  validators.validate([
    param("employeeId").exists().isString().custom(validators.checkObjectId),
  ]),
  employeeController.deleteEmployee
);

module.exports = router;
