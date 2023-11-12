var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.status(200).send("Welcome to Leave Management System!");
});

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
const { sendEmail } = require("../helpers/email");
router.use("/leaves", leaveAPI);

module.exports = router;
