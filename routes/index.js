var express = require("express");
var router = express.Router();

// authAPI
const authAPI = require("./auth.api");
router.use("/auth", authAPI);

// userAPI
const userAPI = require("./user.api");
router.use("/users", userAPI);

// employeeAPI
const postAPI = require("./employee.api");
router.use("/employees", postAPI);

// leaveAPI
const leaveAPI = require("./leave.api");
router.use("/leaves", leaveAPI);

// notificationAPI
const notificationAPI = require("./notification.api");
router.use("/notifications", notificationAPI);

module.exports = router;
