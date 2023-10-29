const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const LeaveBalance = require("../models/LeaveBalance");
const LeaveCategory = require("../models/LeaveCategory");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const { ADMIN_OFFICE, EMPLOYEE, MANAGER } = require("../variables/constants");

const leaveController = {};

leaveController.getCurrentUserLeaves = catchAsync(async (req, res, next) => {
  const allowedFilter = ["category", "status"];

  // Get data from request
  const currentUserId = req.userId;

  let { page, limit, ...filter } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 5;

  // Business Logic Validation
  Object.keys(filter).forEach((key) => {
    if (!allowedFilter.includes(key)) {
      throw new AppError(
        400,
        `Query ${key} is not allowed`,
        "Get Current User Leaves Error"
      );
    }
  });

  // Process
  const filterConditions = [{ requestedUser: currentUserId, isDeleted: false }];

  if (filter.status) {
    filterConditions.push({ status: filter.status });
  }

  if (filter.category) {
    const userInfo = await User.findById(currentUserId);
    const category = await LeaveCategory.findOne({
      $or: [
        { targetType: "All", name: filter.category },
        {
          targetType: "Role",
          targetRole: userInfo.role,
          name: filter.category,
        },
      ],
    });
    filterConditions.push({ category: category._id });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await LeaveRequest.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  const leavesList = await LeaveRequest.find(filterCriteria)
    .populate("category")
    .sort({ fromDate: -1 })
    .skip(offset)
    .limit(limit);

  // Response
  return sendResponse(
    res,
    200,
    true,
    { leavesList, totalPages, count },
    null,
    "Get Current User Leaves Successfully"
  );
});

leaveController.getEmployeeLeaveAdmin = catchAsync(async (req, res, next) => {
  // Process
  const leavesList = await LeaveRequest.find({ isDeleted: false });

  // Response
  return sendResponse(
    res,
    200,
    true,
    leavesList,
    null,
    "Get Employees Leaves Admin Successfully"
  );
});

leaveController.getEmployeeLeaveManager = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Process
  const leavesList = await LeaveRequest.find({
    assignedUser: currentUserId,
    isDeleted: false,
  });

  // Response
  return sendResponse(
    res,
    200,
    true,
    leavesList,
    null,
    "Get Employees Leaves Manager Successfully"
  );
});

leaveController.getPendingLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Process
  const pendingLeave = await LeaveRequest.find({
    assignedUser: currentUserId,
    status: "pending",
    isDeleted: false,
  });

  // Response
  return sendResponse(
    res,
    200,
    true,
    pendingLeave,
    null,
    "Get Pending Leave Successfully"
  );
});

leaveController.getSingleLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const selectedRequestId = req.params.requestId;

  // Business Logic Validation - Process
  const currentUser = await User.findById(currentUserId).populate("role");

  if (
    currentUser.role.name === EMPLOYEE &&
    selectedRequestId.requestedUser.toString() !== currentUserId
  )
    throw new AppError(403, "Access denied", "Get Single Leave Error");

  if (
    currentUser.role.name === MANAGER &&
    selectedRequestId.assignedUser.toString() !== currentUserId
  )
    throw new AppError(403, "Access denied", "Get Single Leave Error");

  const selectedRequest = await LeaveRequest.findOne({
    _id: selectedRequestId,
    isDeleted: false,
  }).populate("category");
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave request not found",
      "Get Single Leave Error"
    );

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Get Single Leave  Successfully"
  );
});

leaveController.getCurrentUserLeaveBalance = catchAsync(
  async (req, res, next) => {
    // Get data from request
    const currentUserId = req.userId;

    // Process
    const leaveBalance = await LeaveBalance.find({
      user: currentUserId,
    }).populate("leaveCategory");
    leaveBalance.sort(
      (a, b) => a.leaveCategory.displayOrder - b.leaveCategory.displayOrder
    );

    // Response
    return sendResponse(
      res,
      200,
      true,
      leaveBalance,
      null,
      "Get Current User Leave Balance Successfully"
    );
  }
);

leaveController.createLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  let { categoryName, fromDate, fromType, toDate, toType, reason } = req.body;

  // Business Logic Validation
  let requestor = await User.findById(currentUserId);
  if (!requestor)
    throw new AppError(400, "User not found", "Create Leave Request Error");
  // Check leave category
  const category = await LeaveCategory.findOne({
    name: categoryName,
    $or: [{ targetRole: requestor.role }, { targetRole: { $exists: false } }],
  });
  if (!category)
    throw new AppError(400, "Category not found", "Create Leave Request Error");

  // Logic for date
  const formattedFromDate = new Date(fromDate);
  const fromDateWithoutTime = new Date(
    formattedFromDate.getFullYear(),
    formattedFromDate.getMonth(),
    formattedFromDate.getDate()
  );
  const formattedToDate = new Date(toDate);
  const toDateWithoutTime = new Date(
    formattedToDate.getFullYear(),
    formattedToDate.getMonth(),
    formattedToDate.getDate()
  );

  // Check logic fromDate and toDate
  if (fromDateWithoutTime > toDateWithoutTime)
    throw new AppError(
      400,
      "FromDate cannot be later than toDate",
      "Create Leave Request Error"
    );

  // Calculate total leave days
  let totalDaysLeave = 0;
  if (fromDateWithoutTime === toDateWithoutTime) {
    if (fromType === "full") {
      totalDaysLeave = 1;
    } else {
      totalDaysLeave = 0.5;
    }
  } else {
    totalDaysLeave =
      (toDateWithoutTime - fromDateWithoutTime) / (1000 * 60 * 60 * 24) + 1;
    if (fromType !== "full") {
      totalDaysLeave -= 0.5;
    }
    if (toType !== "full") {
      totalDaysLeave -= 0.5;
    }
  }
  // Check leave balance
  let leaveBalance = await LeaveBalance.findOne({
    user: currentUserId,
    leaveCategory: category._id,
  }).populate("leaveCategory");
  const toralRemaining =
    leaveBalance.leaveCategory.totalDays - leaveBalance.totalUsed;
  if (toralRemaining < totalDaysLeave)
    throw new AppError(
      400,
      "Insufficient leave balance",
      "Create Leave Request Error"
    );
  // Check apply previous date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (fromDateWithoutTime < yesterday)
    throw new AppError(
      400,
      "Leave cannot be applied for previous time",
      "Create Leave Request Error"
    );
  // Check apply overlap
  const overlapRequest = await LeaveRequest.find({
    requestedUser: currentUserId,
    isDeleted: false,
    $or: [
      {
        fromDate: { $lte: toDateWithoutTime },
        toDate: { $gte: fromDateWithoutTime },
      },
      {
        fromDate: { $lte: toDateWithoutTime },
        toDate: { $gte: toDateWithoutTime },
      },
      {
        fromDate: { $lte: fromDateWithoutTime },
        toDate: { $gte: fromDateWithoutTime },
      },
    ],
  });
  if (overlapRequest.length !== 0)
    throw new AppError(
      400,
      "Leave cannot be applied twice for the same day",
      "Create Leave Request Error"
    );

  // Process
  const leaveRequest = await LeaveRequest.create({
    requestedUser: currentUserId,
    assignedUser: requestor.reportTo,
    category: category._id,
    fromDate: fromDateWithoutTime,
    fromType,
    toDate: toDateWithoutTime,
    toType,
    totalDays: totalDaysLeave,
    reason,
  });
  // Update Leave Balance
  leaveBalance.totalUsed += totalDaysLeave;
  await leaveBalance.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    leaveRequest,
    null,
    "Create Leave Request Successfully"
  );
});

leaveController.updateLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const requestId = req.params.requestId;
  let { categoryName, fromDate, fromType, toDate, toType, reason } = req.body;

  // Business Logic Validation
  let requestor = await User.findById(currentUserId).populate("role");
  if (!requestor)
    throw new AppError(400, "User not found", "Update Leave Request Error");

  let selectedRequest = await LeaveRequest.findById(requestId).populate(
    "category"
  );
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave Request not found",
      "Update Leave Request Error"
    );

  if (selectedRequest.status !== "pending")
    throw new AppError(
      400,
      "Only pending request can be editted ",
      "Update Leave Request Error"
    );
  if (requestor.role.name !== "admin office") {
    if (selectedRequest.requestedUser.toString() !== currentUserId) {
      if (selectedRequest.assignedUser.toString() !== currentUserId) {
        throw new AppError(
          400,
          "Permission Required",
          "Update Leave Request Error"
        );
      }
    }
  }
  // Check leave category
  const category = await LeaveCategory.findOne({
    name: categoryName,
    $or: [{ targetRole: requestor.role }, { targetRole: { $exists: false } }],
  });
  if (!category)
    throw new AppError(400, "Category not found", "Create Leave Request Error");

  // Logic for date

  const formattedFromDate = new Date(fromDate);
  const fromDateWithoutTime = new Date(
    formattedFromDate.getFullYear(),
    formattedFromDate.getMonth(),
    formattedFromDate.getDate()
  );
  const formattedToDate = new Date(toDate);
  const toDateWithoutTime = new Date(
    formattedToDate.getFullYear(),
    formattedToDate.getMonth(),
    formattedToDate.getDate()
  );

  // Check logic fromDate and toDate
  if (fromDateWithoutTime > toDateWithoutTime)
    throw new AppError(
      400,
      "FromDate cannot be later than toDate",
      "Create Leave Request Error"
    );

  // Calculate total leave days
  let totalDaysLeave = 0;

  if (fromDateWithoutTime.getTime() === toDateWithoutTime.getTime()) {
    if (fromType === "full") {
      totalDaysLeave = 1;
    } else {
      totalDaysLeave = 0.5;
    }
  } else {
    totalDaysLeave =
      (toDateWithoutTime - fromDateWithoutTime) / (1000 * 60 * 60 * 24) + 1;
    if (fromType !== "full") {
      totalDaysLeave -= 0.5;
    }
    if (toType !== "full") {
      totalDaysLeave -= 0.5;
    }
  }

  // Check apply previous date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (fromDateWithoutTime < yesterday)
    throw new AppError(
      400,
      "Leave cannot be applied for previous time",
      "Create Leave Request Error"
    );

  // Check apply overlap
  const overlapRequest = await LeaveRequest.find({
    requestedUser: currentUserId,
    _id: { $ne: selectedRequest._id },
    $or: [
      {
        fromDate: { $lte: toDateWithoutTime },
        toDate: { $gte: fromDateWithoutTime },
      },
      {
        fromDate: { $lte: toDateWithoutTime },
        toDate: { $gte: toDateWithoutTime },
      },
      {
        fromDate: { $lte: fromDateWithoutTime },
        toDate: { $gte: fromDateWithoutTime },
      },
    ],
  });
  if (overlapRequest.length !== 0)
    throw new AppError(
      400,
      "Leave cannot be applied twice for the same day",
      "Create Leave Request Error"
    );

  // Check leave balance
  if (selectedRequest.category.name === categoryName) {
    let leaveBalance = await LeaveBalance.findOne({
      user: selectedRequest.requestedUser,
      leaveCategory: selectedRequest.category,
    }).populate("leaveCategory");
    const toralRemainingUpdated =
      leaveBalance.leaveCategory.totalDays -
      leaveBalance.totalUsed +
      selectedRequest.totalDays;
    if (toralRemainingUpdated < totalDaysLeave)
      throw new AppError(
        400,
        "Insufficient leave balance",
        "Create Leave Request Error"
      );
    // Update Leave Balance
    leaveBalance.totalUsed =
      leaveBalance.totalUsed - selectedRequest.totalDays + totalDaysLeave;
    await leaveBalance.save();
  } else {
    let leaveBalanceOld = await LeaveBalance.findOne({
      user: selectedRequest.requestedUser,
      leaveCategory: selectedRequest.category,
    }).populate("leaveCategory");

    let leaveBalanceNew = await LeaveBalance.findOne({
      user: selectedRequest.requestedUser,
      leaveCategory: category._id,
    }).populate("leaveCategory");
    const toralRemainingNew =
      leaveBalanceNew.leaveCategory.totalDays - leaveBalanceNew.totalUsed;
    if (toralRemainingNew < totalDaysLeave)
      throw new AppError(
        400,
        "Insufficient leave balance",
        "Create Leave Request Error"
      );

    // Update Leave Balance
    leaveBalanceOld.totalUsed -= selectedRequest.totalDays;
    leaveBalanceNew.totalUsed += totalDaysLeave;
    await leaveBalanceOld.save();
    await leaveBalanceNew.save();
  }

  // Update request

  selectedRequest.category = category._id;
  selectedRequest.fromDate = fromDateWithoutTime;
  selectedRequest.fromType = fromType;
  selectedRequest.toDate = toDateWithoutTime;
  selectedRequest.toType = toType;
  selectedRequest.totalDays = totalDaysLeave;
  selectedRequest.reason = reason;

  await selectedRequest.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Update Leave Request Successfully"
  );
});

leaveController.deleteLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const requestId = req.params.requestId;

  // Business Logic Validation
  let requestor = await User.findById(currentUserId).populate("role");
  if (!requestor)
    throw new AppError(400, "User not found", "Delete Leave Request Error");

  let selectedRequest = await LeaveRequest.findById(requestId);
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave Request not found",
      "Delete Leave Request Error"
    );

  if (selectedRequest.status !== "pending")
    throw new AppError(
      400,
      "Only pending request can be deleted ",
      "Delete Leave Request Error"
    );

  if (requestor.role.name !== ADMIN_OFFICE) {
    if (selectedRequest.requestedUser.toString() !== currentUserId) {
      if (selectedRequest.assignedUser.toString() !== currentUserId) {
        throw new AppError(
          400,
          "Permission Required",
          "Delete Leave Request Error"
        );
      }
    }
  }

  let deletedRequest = await LeaveRequest.findOneAndUpdate(
    {
      _id: requestId,
    },
    { isDeleted: true },
    { new: true }
  );

  // Update Leave Balance
  let leaveBalance = await LeaveBalance.findOne({
    user: selectedRequest.requestedUser,
    leaveCategory: selectedRequest.category,
  });

  leaveBalance.totalUsed -= selectedRequest.totalDays;
  await leaveBalance.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    deletedRequest,
    null,
    "Delete Leave Request Successfully"
  );
});

leaveController.approveLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const requestId = req.params.requestId;

  // Business Logic Validation
  let approvedUser = await User.findById(currentUserId).populate("role");

  let selectedRequest = await LeaveRequest.findById(requestId);
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave Request not found",
      "Approve Leave Request Error"
    );

  if (selectedRequest.status !== "pending")
    throw new AppError(
      400,
      "Only pending request can be approved ",
      "Approve Leave Request Error"
    );

  if (approvedUser.role.name !== ADMIN_OFFICE) {
    if (selectedRequest.assignedUser.toString() !== currentUserId) {
      throw new AppError(
        400,
        "Permission Required",
        "Approve Leave Request Error"
      );
    }
  }

  // Approve
  selectedRequest.status = "approved";
  await selectedRequest.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Approve Leave Request Successfully"
  );
});

leaveController.rejectLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const requestId = req.params.requestId;

  // Business Logic Validation
  let rejectedUser = await User.findById(currentUserId).populate("role");

  let selectedRequest = await LeaveRequest.findById(requestId);
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave Request not found",
      "Reject Leave Request Error"
    );

  if (selectedRequest.status !== "pending")
    throw new AppError(
      400,
      "Only pending request can be rejected ",
      "Reject Leave Request Error"
    );

  if (rejectedUser.role.name !== ADMIN_OFFICE) {
    if (selectedRequest.assignedUser.toString() !== currentUserId) {
      throw new AppError(
        400,
        "Permission Required",
        "Reject Leave Request Error"
      );
    }
  }

  // Reject
  selectedRequest.status = "rejected";
  await selectedRequest.save();

  let requestor = await User.findById(selectedRequest.requestedUser);
  // Update Leave Balance
  let leaveBalance = await LeaveBalance.findOne({
    user: requestor._id,
    leaveCategory: selectedRequest.category,
  });

  leaveBalance.totalUsed -= selectedRequest.totalDays;
  leaveBalance.totalRemaining += selectedRequest.totalDays;
  await leaveBalance.save();

  // Update User
  requestor.leaveCount -= selectedRequest.totalDays;
  await requestor.save();

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Reject Leave Request Successfully"
  );
});
module.exports = leaveController;
