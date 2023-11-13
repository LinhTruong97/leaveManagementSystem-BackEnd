const { sendEmail } = require("../helpers/email");
const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const LeaveBalance = require("../models/LeaveBalance");
const LeaveCategory = require("../models/LeaveCategory");
const Role = require("../models/Role");
const User = require("../models/User");
const { MANAGER, ADMIN_OFFICE } = require("../variables/constants");
const START_DATE = process.env.START_DATE;

const employeeController = {};

employeeController.createNewEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  let { fullName, email, role, reportTo, birthday } = req.body;

  // Business Logic Validation
  let employee = await User.findOne({ email });
  if (employee)
    throw new AppError(
      400,
      "User's email already exists",
      "Create New Employee Error"
    );

  // Process
  const roleInfo = await Role.findOne({ name: role });

  employee = await User.create({
    fullName,
    email,
    role: roleInfo._id,
    reportTo,
    birthday,
  });

  const leaveCategoryList = await LeaveCategory.find({
    $or: [
      { targetType: "All" },
      { targetType: "Role", targetRole: roleInfo._id },
    ],
  });

  const currentYear = new Date().getFullYear();
  const formattedExpiredDate = `${START_DATE}/${currentYear}`;
  const expiredDate = new Date(formattedExpiredDate);

  leaveCategoryList.forEach(async (category) => {
    const newLeaveBalance = await LeaveBalance.create({
      user: employee._id,
      leaveCategory: category._id,
      totalUsed: 0,
      expiredDate: expiredDate,
    });

    await newLeaveBalance.save();
  });

  const setupToken = await employee.generateSetupToken();

  const setupAccountLink = `${process.env.REACT_APP_FRONTEND_API}/auth/setup/${setupToken}`;

  await sendEmail(email, fullName, setupAccountLink);

  // Response
  sendResponse(
    res,
    200,
    true,
    employee,
    null,
    "Create New Employee Successfully"
  );
});

employeeController.getEmployees = catchAsync(async (req, res, next) => {
  const allowedFilter = ["fullName", "status", "role"];

  // Get data from request
  const currentUserId = req.userId;

  let { page, limit, ...filter } = req.query;

  // Business Logic Validation
  Object.keys(filter).forEach((key) => {
    if (!allowedFilter.includes(key)) {
      throw new AppError(
        400,
        `Query ${key} is not allowed`,
        "Get List of Employees Error"
      );
    }
  });

  const currentUser = await User.findById(currentUserId).populate("role");

  // Process

  const filterConditions = [{ isDeleted: false }];

  if (currentUser.role.name === MANAGER) {
    filterConditions.push({ reportTo: currentUserId });
  }

  if (filter.fullName) {
    filterConditions.push({
      fullName: { $regex: filter.fullName, $options: "i" },
    });
  }

  if (filter.status) {
    filterConditions.push({ status: filter.status });
  }
  if (filter.role) {
    const roleInfo = await Role.findOne({ name: filter.role });

    filterConditions.push({ role: roleInfo._id });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await User.countDocuments(filterCriteria);
  let employeeList = [];
  let totalPages = 0;
  if (page && limit) {
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    totalPages = Math.ceil(count / limit);
    const offset = limit * (page - 1);
    employeeList = await User.find(filterCriteria)
      .populate("role")
      .skip(offset)
      .limit(limit);
  }

  // Response
  return sendResponse(
    res,
    200,
    true,
    { employeeList, totalPages, count },
    null,
    "Get List of Employees Successfully"
  );
});

employeeController.getReportToEmployees = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Process

  const roleId = await Role.find({
    $or: [{ name: MANAGER }, { name: ADMIN_OFFICE }],
  });
  let employeeList = await User.find({
    isDeleted: false,
    role: { $in: roleId.map((role) => role._id) },
  })
    .populate("role")
    .sort({ createdAt: -1 });

  // Response
  return sendResponse(
    res,
    200,
    true,
    employeeList,
    null,
    "Get List of Employees Successfully"
  );
});

employeeController.getSingleEmployee = catchAsync(async (req, res, next) => {
  // Get data from request

  const currentUserId = req.userId;
  const selectedEmployeeId = req.params.employeeId;

  // Business Logic Validation - Process

  const currentUser = await User.findById(currentUserId).populate("role");

  const selectedEmployee = await User.findOne({
    _id: selectedEmployeeId,
    isDeleted: false,
  }).populate("role");
  const selectedReportToEmployee = await User.findOne({
    _id: selectedEmployee.reportTo,
    isDeleted: false,
  }).populate("role");

  if (!selectedEmployee)
    throw new AppError(400, "Employee not found", "Get Single Employee Error");

  if (
    currentUser.role.name === MANAGER &&
    selectedEmployee.reportTo.toString() !== currentUserId
  )
    throw new AppError(403, "Access denied", "Get Single Employee Error");

  // Response
  return sendResponse(
    res,
    200,
    true,
    { selectedEmployee, selectedReportToEmployee },
    null,
    "Get Single Employee Successfully"
  );
});

employeeController.updateEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const updatedEmployeeId = req.params.employeeId;
  const { userName, email, role } = req.body;

  // Business Logic Validation

  let updatedEmployee = await User.findOne({
    _id: updatedEmployeeId,
    isDeleted: false,
  });
  if (!updatedEmployee)
    throw new AppError(400, "Employee not found", "Update Employee Error");

  const userSameName = await User.findOne({
    userName,
    _id: { $ne: updatedEmployeeId },
  });

  if (userSameName)
    throw new AppError(
      400,
      "User Name has been already taken",
      "Update Employee Error"
    );

  const userSameEmail = await User.findOne({
    email,
    _id: { $ne: updatedEmployeeId },
  });
  if (userSameEmail)
    throw new AppError(
      400,
      "User Email has been already existed",
      "Update Employee Error"
    );

  const roleInfo = await Role.findOne({ name: role });
  updatedEmployee[role] = roleInfo._id;

  const allows = [
    "userName",
    "fullName",
    "email",
    "reportTo",
    "gender",
    "phone",
    "address",
    "birthday",
  ];
  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      updatedEmployee[field] = req.body[field];
    }
  });
  await updatedEmployee.save();
  // Response
  return sendResponse(
    res,
    200,
    true,
    updatedEmployee,
    null,
    "Update Employee Successfully"
  );
});

employeeController.terminateEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const terminatedEmployeeId = req.params.employeeId;

  // Business Logic Validation

  let terminatedEmployee = await User.findOne({
    _id: terminatedEmployeeId,
    isDeleted: false,
  });
  if (!terminatedEmployee)
    throw new AppError(400, "Employee not found", "Terminate Employee Error");

  // Process
  terminatedEmployee.status = "terminated";
  await terminatedEmployee.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    terminatedEmployee,
    null,
    "Terminate Employee Successfully"
  );
});

employeeController.reactivateEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const reactivatedEmployeeId = req.params.employeeId;

  // Business Logic Validation

  let reactivatedEmployee = await User.findOne({
    _id: reactivatedEmployeeId,
    isDeleted: false,
  });
  if (!reactivatedEmployee)
    throw new AppError(400, "Employee not found", "Reactivate Employee Error");

  // Process
  reactivatedEmployee.status = "active";
  await reactivatedEmployee.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    reactivatedEmployee,
    null,
    "Reactivate Employee Successfully"
  );
});

employeeController.deleteEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const deletedEmployeeId = req.params.employeeId;

  // Business Logic Validation

  let deletedEmployee = await User.findOneAndUpdate(
    {
      _id: deletedEmployeeId,
    },
    { isDeleted: true },
    { new: true }
  );
  if (!deletedEmployee)
    throw new AppError(400, "Employee not found", "Delete Employee Error");

  // Response
  return sendResponse(
    res,
    200,
    true,
    deletedEmployee,
    null,
    "Delete Employee Successfully"
  );
});

module.exports = employeeController;
