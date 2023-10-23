const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const LeaveBalance = require("../models/LeaveBalance");
const LeaveCategory = require("../models/LeaveCategory");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");

const leaveController = {};

leaveController.getCurrentUserLeaves = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Process
  const leavesList = await LeaveRequest.find({ requestedUser: currentUserId });

  // Response
  return sendResponse(
    res,
    200,
    true,
    leavesList,
    null,
    "Get Current User Leaves Successfully"
  );
});

leaveController.getEmployeeLeaveAdmin = catchAsync(async (req, res, next) => {
  // Process
  const leavesList = await LeaveRequest.find();

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
  const leavesList = await LeaveRequest.find({ assignedUser: currentUserId });

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

leaveController.getSingleLeaveAdmin = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const selectedRequestId = req.params.requestId;

  // Business Logic Validation - Process
  const selectedRequest = await LeaveRequest.findById(selectedRequestId);
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave request not found",
      "Get Single Leave Admin Error"
    );

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Get Single Leave Admin Successfully"
  );
});

leaveController.getSingleLeaveManager = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const selectedRequestId = req.params.requestId;

  // Business Logic Validation - Process
  const selectedRequest = await LeaveRequest.findById(selectedRequestId);
  if (!selectedRequest)
    throw new AppError(
      400,
      "Leave request not found",
      "Get Single Leave Manager Error"
    );

  // Response
  return sendResponse(
    res,
    200,
    true,
    selectedRequest,
    null,
    "Get Single Leave Manager Successfully"
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
  let { categoryName, fromDate, fromType, toDate, toType, reason, document } =
    req.body;

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
  const formattedFromDate = new Date(fromDate + "T00:00:00.000Z");
  const formattedToDate = new Date(toDate + "T00:00:00.000Z");

  // Check logic fromDate and toDate
  if (formattedFromDate > formattedToDate)
    throw new AppError(
      400,
      "FromDate cannot be later than toDate",
      "Create Leave Request Error"
    );

  // Calculate total leave days
  let totalDaysLeave = 0;
  if (fromDate === toDate) {
    if (fromType === "full") {
      totalDaysLeave = 1;
    } else {
      totalDaysLeave = 0.5;
    }
  } else {
    totalDaysLeave =
      (formattedToDate - formattedFromDate) / (1000 * 60 * 60 * 24) + 1;
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
  });
  if (leaveBalance.totalRemaining < totalDaysLeave)
    throw new AppError(
      400,
      "Insufficient leave balance",
      "Create Leave Request Error"
    );
  // Check apply previous date
  const today = new Date().setHours(0, 0, 0, 0);
  if (formattedFromDate < today)
    throw new AppError(
      400,
      "Leave cannot be applied for previous date",
      "Create Leave Request Error"
    );
  // Check apply overlap
  const overlapRequest = await LeaveRequest.find({
    requestedUser: currentUserId,
    $or: [
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedFromDate },
      },
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedToDate },
      },
      {
        fromDate: { $lte: formattedFromDate },
        toDate: { $gte: formattedFromDate },
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
    fromDate,
    fromType,
    toDate,
    toType,
    totalDays: totalDaysLeave,
    reason,
    document,
  });
  // Update Leave Balance
  leaveBalance.totalUsed += totalDaysLeave;
  leaveBalance.totalRemaining -= totalDaysLeave;
  await leaveBalance.save();
  // Update User
  requestor.leaveCount += totalDaysLeave;
  await requestor.save();

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
  let { categoryName, fromDate, fromType, toDate, toType, reason, document } =
    req.body;

  // Business Logic Validation
  let requestor = await User.findById(currentUserId).populate("role");
  if (!requestor)
    throw new AppError(400, "User not found", "Update Leave Request Error");

  let selectedRequest = await LeaveRequest.findById(requestId);
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

  // Logic for date

  if (fromDate && toDate && fromType && toType) {
    const formattedFromDate = new Date(fromDate + "T00:00:00.000Z");
    const formattedToDate = new Date(toDate + "T00:00:00.000Z");

    // Check logic fromDate and toDate
    if (formattedFromDate > formattedToDate)
      throw new AppError(
        400,
        "FromDate cannot be later than toDate",
        "Create Leave Request Error"
      );

    // Calculate total leave days
    let totalDaysLeave = 0;
    if (fromDate === toDate) {
      if (fromType === "full") {
        totalDaysLeave = 1;
      } else {
        totalDaysLeave = 0.5;
      }
    } else {
      totalDaysLeave =
        (formattedToDate - formattedFromDate) / (1000 * 60 * 60 * 24) + 1;
      if (fromType !== "full") {
        totalDaysLeave -= 0.5;
      }
      if (toType !== "full") {
        totalDaysLeave -= 0.5;
      }
    }
    // Check leave balance
    let leaveBalance = await LeaveBalance.findOne({
      user: selectedRequest.requestedUser,
      leaveCategory: selectedRequest.category,
    });
    if (leaveBalance.totalRemaining < totalDaysLeave)
      throw new AppError(
        400,
        "Insufficient leave balance",
        "Create Leave Request Error"
      );
    // Check apply previous date
    const today = new Date().setHours(0, 0, 0, 0);
    if (formattedFromDate < today)
      throw new AppError(
        400,
        "Leave cannot be applied for previous date",
        "Create Leave Request Error"
      );
    // Check apply overlap
    const overlapRequest = await LeaveRequest.find({
      requestedUser: currentUserId,
      _id: { $ne: selectedRequest._id },
      $or: [
        {
          fromDate: { $lte: formattedToDate },
          toDate: { $gte: formattedFromDate },
        },
        {
          fromDate: { $lte: formattedToDate },
          toDate: { $gte: formattedToDate },
        },
        {
          fromDate: { $lte: formattedFromDate },
          toDate: { $gte: formattedFromDate },
        },
      ],
    });
    if (overlapRequest.length !== 0)
      throw new AppError(
        400,
        "Leave cannot be applied twice for the same day",
        "Create Leave Request Error"
      );

    // Update Leave Balance

    leaveBalance.totalUsed =
      leaveBalance.totalUsed - selectedRequest.totalDays + totalDaysLeave;
    leaveBalance.totalRemaining =
      leaveBalance.totalRemaining + selectedRequest.totalDays - totalDaysLeave;
    await leaveBalance.save();

    // Update User
    requestor.leaveCount =
      requestor.leaveCount - selectedRequest.totalDays + totalDaysLeave;
    await requestor.save();

    // Update request
    selectedRequest.fromDate = fromDate;
    selectedRequest.fromType = fromType;
    selectedRequest.toDate = toDate;
    selectedRequest.toType = toType;
    selectedRequest.totalDays = totalDaysLeave;
  }

  if (reason) {
    selectedRequest.reason = reason;
  }

  if (document) {
    selectedRequest.document = document;
  }

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

  if (requestor.role.name !== "admin office") {
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

  let deletedRequest = await LeaveRequest.findByIdAndDelete(requestId);

  // Update Leave Balance
  let leaveBalance = await LeaveBalance.findOne({
    user: selectedRequest.requestedUser,
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

  if (approvedUser.role.name !== "admin office") {
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

  if (rejectedUser.role.name !== "admin office") {
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
