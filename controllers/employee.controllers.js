const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const LeaveBalance = require("../models/LeaveBalance");
const LeaveCategory = require("../models/LeaveCategory");
const Role = require("../models/Role");
const User = require("../models/User");
const START_DATE = process.env.START_DATE;

const employeeController = {};

employeeController.createNewEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  let { fullName, email, role, reportTo } = req.body;

  // Business Logic Validation
  let employee = await User.findOne({ email });
  if (employee)
    throw new AppError(
      400,
      "User's email already exists",
      "Create New Employee Error"
    );

  // Process
  const roleInfo = await Role.findOne({ roleId: role });

  employee = await User.create({
    fullName,
    email,
    role: roleInfo._id,
    reportTo,
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
      totalRemaining: category.totalDays,
      expiredDate: expiredDate,
    });

    // Save the leave balance
    await newLeaveBalance.save();
  });

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

employeeController.getEmployeesAdmin = catchAsync(async (req, res, next) => {
  const allowedFilter = ["userName", "fullName", "status", "role"];

  // Get data from request
  const currentUserId = req.userId;

  let { page, limit, ...filter } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  // Business Logic Validation
  Object.keys(filter).forEach((key) => {
    if (!allowedFilter.includes(key)) {
      throw new AppError(
        400,
        `Query ${key} is not allowed`,
        "Get Admin's Employees Error"
      );
    }
  });

  // Process

  const filterConditions = [];

  if (filter.userName) {
    filterConditions.push({
      userName: { $regex: filter.userName, $options: "i" },
    });
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
    const roleObjectId = await Role.find({ roleId: filter.role });
    filterConditions.push({ role: roleObjectId });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};
  const count = await User.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let employees = await User.find(filterCriteria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  // Response
  return sendResponse(
    res,
    200,
    true,
    { employees, totalPages, count },
    null,
    "Get Admin's Employees Successfully"
  );
});

employeeController.getEmployeesManager = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  let { page, limit, ...filter } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  // Business Logic Validation
  const allowedFilter = ["userName", "fullName", "status"];
  Object.keys(filter).forEach((key) => {
    if (!allowedFilter.includes(key)) {
      throw new AppError(
        400,
        `Query ${key} is not allowed`,
        "Get Manager's Employees Error"
      );
    }
  });

  // Process

  const filterConditions = [{ reportTo: currentUserId }];

  if (filter.userName) {
    filterConditions.push({
      userName: { $regex: filter.userName, $options: "i" },
    });
  }
  if (filter.fullName) {
    filterConditions.push({
      fullName: { $regex: filter.fullName, $options: "i" },
    });
  }
  if (filter.status) {
    filterConditions.push({ status: filter.status });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};
  const count = await User.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let employees = await User.find(filterCriteria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  // Response
  return sendResponse(
    res,
    200,
    true,
    { employees, totalPages, count },
    null,
    "Get Manager's Employees Successfully"
  );
});

employeeController.getSingleEmployeeAdmin = catchAsync(
  async (req, res, next) => {
    // Get data from request

    const currentUserId = req.userId;
    const selectedEmployeeId = req.params.employeeId;

    // Business Logic Validation - Process
    const selectedEmployee = await User.findById(selectedEmployeeId);
    if (!selectedEmployee)
      throw new AppError(
        400,
        "Employee not found",
        "Get Single Employee Admin Error"
      );

    // Response
    return sendResponse(
      res,
      200,
      true,
      selectedEmployee,
      null,
      "Get Single Employee Admin Successfully"
    );
  }
);

employeeController.getSingleEmployeeManager = catchAsync(
  async (req, res, next) => {
    // Get data from request

    const currentUserId = req.userId;
    const selectedEmployeeId = req.params.employeeId;

    // Business Logic Validation - Process
    const selectedEmployee = await User.findById(selectedEmployeeId);
    if (!selectedEmployee)
      throw new AppError(
        400,
        "Employee not found",
        "Get Single Employee Manager Error"
      );

    if (selectedEmployee.reportTo.toString() !== currentUserId)
      throw new AppError(
        403,
        "Access denied",
        "Get Single Employee Manager Error"
      );
    // Response
    return sendResponse(
      res,
      200,
      true,
      selectedEmployee,
      null,
      "Get Single Employee Manager Successfully"
    );
  }
);

employeeController.updateEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const updatedEmployeeId = req.params.employeeId;
  const { userName, email } = req.body;

  // Business Logic Validation

  let updatedEmployee = await User.findById(updatedEmployeeId);
  if (!updatedEmployee)
    throw new AppError(400, "Employee not found", "Update Employee Error");

  if (userName) {
    const userSameName = await User.findOne({ userName });
    if (userSameName && userSameName._id !== updatedEmployeeId)
      throw new AppError(
        400,
        "User Name has been already taken",
        "Update Employee Error"
      );
  }
  if (email) {
    const userSameEmail = await User.findOne({ email });
    if (userSameEmail && userSameEmail._id !== updatedEmployeeId)
      throw new AppError(
        400,
        "User Email has been already existed",
        "Update Employee Error"
      );
  }

  // Process
  const allows = [
    "userName",
    "fullName",
    "email",
    "role",
    "reportTo",
    "gender",
    "phone",
    "address",
    "avatarUrl",
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

  let terminatedEmployee = await User.findById(terminatedEmployeeId);
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

employeeController.deleteEmployee = catchAsync(async (req, res, next) => {
  // Get data from request
  const deletedEmployeeId = req.params.employeeId;

  // Business Logic Validation

  let deletedEmployee = await User.findByIdAndDelete(deletedEmployeeId);
  if (!deletedEmployee)
    throw new AppError(400, "Employee not found", "Delete Employee Error");
  await LeaveBalance.deleteMany({ user: deletedEmployeeId });

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
