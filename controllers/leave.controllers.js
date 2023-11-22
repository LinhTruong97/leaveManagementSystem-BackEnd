const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const LeaveBalance = require("../models/LeaveBalance");
const LeaveCategory = require("../models/LeaveCategory");
const LeaveRequest = require("../models/LeaveRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  ADMIN_OFFICE,
  EMPLOYEE,
  MANAGER,
  NOTIFICATION_SUBMIT_LEAVE,
  NOTIFICATION_APPROVE_LEAVE,
  NOTIFICATION_REJECT_LEAVE,
} = require("../variables/constants");

const firebaseAdmin = require("../firebaseSetup");

const leaveController = {};

leaveController.getCurrentUserLeaves = catchAsync(async (req, res, next) => {
  const allowedFilter = ["category", "status"];

  // Get data from request
  const currentUserId = req.userId;

  let { page, limit, ...filter } = req.query;

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

  let currentPageLeavesList = [];
  let totalPages = 0;
  const count = await LeaveRequest.countDocuments(filterCriteria);
  const pendingCount = await LeaveRequest.countDocuments({
    requestedUser: currentUserId,
    isDeleted: false,
    status: "pending",
  });

  if (page && limit) {
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;
    totalPages = Math.ceil(count / limit);
    const offset = limit * (page - 1);
    currentPageLeavesList = await LeaveRequest.find(filterCriteria)
      .populate("category")
      .populate("requestedUser")
      .sort({ fromDate: -1 })
      .skip(offset)
      .limit(limit);
  }
  const fullLeavesList = await LeaveRequest.find({
    ...filterCriteria,
    status: { $ne: "rejected" },
  })
    .populate("category")
    .populate("requestedUser")
    .sort({ fromDate: -1 });

  // Response
  return sendResponse(
    res,
    200,
    true,
    { fullLeavesList, currentPageLeavesList, totalPages, count, pendingCount },
    null,
    "Get Current User Leaves Successfully"
  );
});

leaveController.getEmployeeLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;

  // Business Logic Validation
  const currentUser = await User.findById(currentUserId).populate("role");

  // Process

  const filterConditions = [{ isDeleted: false, status: { $ne: "rejected" } }];

  if (currentUser.role.name === MANAGER) {
    filterConditions.push({ assignedUser: currentUserId });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const leavesList = await LeaveRequest.find(filterCriteria)
    .populate("requestedUser")
    .populate("assignedUser")
    .populate("category");

  // Response
  return sendResponse(
    res,
    200,
    true,
    leavesList,
    null,
    "Get Employees Leaves Successfully"
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
  })
    .populate("assignedUser")
    .populate("requestedUser")
    .populate("category");

  const totalPendingCount = await LeaveRequest.countDocuments({
    assignedUser: currentUserId,
    status: "pending",
    isDeleted: false,
  });

  // Response
  return sendResponse(
    res,
    200,
    true,
    { pendingLeave, totalPendingCount },
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

  if (
    currentUser.role.name === EMPLOYEE &&
    selectedRequest.requestedUser.toString() !== currentUserId
  )
    throw new AppError(403, "Access denied", "Get Single Leave Error");

  if (
    currentUser.role.name === MANAGER &&
    selectedRequest.requestedUser.toString() !== currentUserId &&
    selectedRequest.assignedUser.toString() !== currentUserId
  )
    throw new AppError(403, "Access denied", "Get Single Leave Error");

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

    const totalUsedSum = leaveBalance.reduce(
      (sum, item) => sum + item.totalUsed,
      0
    );

    const totalHadSum = leaveBalance.reduce(
      (sum, item) => sum + item.totalAvailable,
      0
    );

    const totalRemainingSum = totalHadSum - totalUsedSum;
    // Response
    return sendResponse(
      res,
      200,
      true,
      { leaveBalance, totalUsedSum, totalHadSum, totalRemainingSum },
      null,
      "Get Current User Leave Balance Successfully"
    );
  }
);

leaveController.createLeave = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  let { categoryName, fromDate, toDate, type, reason } = req.body;

  // Business Logic Validation
  let requestor = await User.findById(currentUserId).populate("reportTo");
  if (!requestor)
    throw new AppError(400, "User not found", "Create Leave Request Error");
  // Check leave category
  const category = await LeaveCategory.findOne({
    name: categoryName,
    $or: [{ targetRole: requestor.role }, { targetRole: { $exists: false } }],
  });
  if (!category)
    throw new AppError(400, "Category not found", "Create Leave Request Error");

  // // Logic for date
  const formattedFromDate = new Date(fromDate);
  const formattedToDate = new Date(toDate);

  // Check logic fromDate and toDate
  if (formattedFromDate > formattedToDate)
    throw new AppError(
      400,
      "FromDate cannot be later than toDate",
      "Create Leave Request Error"
    );

  // Calculate total leave days
  let totalDaysLeave = 0;

  if (type === "full") {
    totalDaysLeave = Math.ceil(
      (formattedToDate - formattedFromDate) / (1000 * 60 * 60 * 24)
    );
  } else {
    totalDaysLeave = 0.5;
  }

  // Check leave balance
  let leaveBalance = await LeaveBalance.findOne({
    user: currentUserId,
    leaveCategory: category._id,
  }).populate("leaveCategory");
  const toralRemaining = leaveBalance.totalAvailable - leaveBalance.totalUsed;
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

  if (formattedFromDate < yesterday)
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
      // Check if document's date range overlaps with or includes request date range .
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedFromDate },
      },
      //checks if the document's date range includes or ends on requestToDate.
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedToDate },
      },
      //checks if the document's date range includes or begins on requestFromDate.
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
    fromDate: formattedFromDate,
    toDate: formattedToDate,
    type,
    totalDays: totalDaysLeave,
    reason,
  });

  // Update Leave Balance
  leaveBalance.totalUsed += totalDaysLeave;
  await leaveBalance.save();

  // Create notification
  const notiMessage = NOTIFICATION_SUBMIT_LEAVE;

  await Notification.create({
    targetUser: requestor.reportTo,
    leaveRequest: leaveRequest._id,
    type: "leave_submit",
    message: notiMessage,
  });

  // Send noti to firebase
  const fcmTokensList = requestor.reportTo.fcmTokens;

  fcmTokensList.forEach(async (currentFcmToken) => {
    const message = {
      notification: {
        title: "Notification",
        body: "You have new notification",
      },
      token: currentFcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
  });

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
  let { categoryName, fromDate, toDate, type, reason } = req.body;

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

  const formattedToDate = new Date(toDate);

  // Check logic fromDate and toDate
  if (formattedFromDate > formattedToDate)
    throw new AppError(
      400,
      "FromDate cannot be later than toDate",
      "Create Leave Request Error"
    );

  // Calculate total leave days
  let totalDaysLeave = 0;

  if (type === "full") {
    totalDaysLeave = Math.ceil(
      (formattedToDate - formattedFromDate) / (1000 * 60 * 60 * 24)
    );
  } else {
    totalDaysLeave = 0.5;
  }

  // Check apply previous date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (formattedFromDate < yesterday)
    throw new AppError(
      400,
      "Leave cannot be applied for previous time",
      "Create Leave Request Error"
    );

  // Check apply overlap
  const overlapRequest = await LeaveRequest.find({
    requestedUser: currentUserId,
    isDeleted: false,
    _id: { $ne: selectedRequest._id },
    $or: [
      // Check if document's date range overlaps with or includes request date range .
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedFromDate },
      },
      //checks if the document's date range includes or ends on requestToDate.
      {
        fromDate: { $lte: formattedToDate },
        toDate: { $gte: formattedToDate },
      },
      //checks if the document's date range includes or begins on requestFromDate.
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

  // Check leave balance
  if (selectedRequest.category.name === categoryName) {
    let leaveBalance = await LeaveBalance.findOne({
      user: selectedRequest.requestedUser,
      leaveCategory: selectedRequest.category,
    }).populate("leaveCategory");
    const toralRemainingUpdated =
      leaveBalance.totalAvailable -
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
      leaveBalanceNew.totalAvailable - leaveBalanceNew.totalUsed;
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
  selectedRequest.fromDate = formattedFromDate;
  selectedRequest.toDate = formattedToDate;
  selectedRequest.type = type;
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

  let selectedRequest = await LeaveRequest.findById(requestId).populate(
    "requestedUser"
  );
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

  const notiMessage = NOTIFICATION_APPROVE_LEAVE;

  await Notification.create({
    targetUser: selectedRequest.requestedUser,
    leaveRequest: selectedRequest._id,
    type: "leave_approve",
    message: notiMessage,
  });

  // Send noti to firebase
  const fcmTokensList = selectedRequest.requestedUser.fcmTokens;

  fcmTokensList.forEach(async (currentFcmToken) => {
    const message = {
      notification: {
        title: "Notification",
        body: "You have new notification",
      },
      token: currentFcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
  });

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
  let selectedRequest = await LeaveRequest.findById(requestId).populate(
    "requestedUser"
  );
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

  let requestor = await User.findById(selectedRequest.requestedUser);
  // Update Leave Balance
  let leaveBalance = await LeaveBalance.findOne({
    user: requestor._id,
    leaveCategory: selectedRequest.category,
  });

  leaveBalance.totalUsed -= selectedRequest.totalDays;
  await leaveBalance.save();

  // Reject
  selectedRequest.status = "rejected";
  await selectedRequest.save();

  const notiMessage = NOTIFICATION_REJECT_LEAVE;

  await Notification.create({
    targetUser: selectedRequest.requestedUser,
    leaveRequest: selectedRequest._id,
    type: "leave_reject",
    message: notiMessage,
  });

  // Send noti to firebase
  const fcmTokensList = selectedRequest.requestedUser.fcmTokens;

  fcmTokensList.forEach(async (currentFcmToken) => {
    const message = {
      notification: {
        title: "Notification",
        body: "You have new notification",
      },
      token: currentFcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
  });

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

leaveController.getLeaveByMonth = catchAsync(async (req, res, next) => {
  // Get data from request
  const currentUserId = req.userId;
  const { year } = req.params;

  let totalApprovedLeave = 0;
  const startPeriod = new Date(`${year}-01-01`);
  const endPeriod = new Date(`${year}-12-31`);

  // Business Logic Validation
  const currentUser = await User.findById(currentUserId).populate("role");

  const filterConditions = [
    {
      status: "approved",
      $and: [
        { fromDate: { $gte: startPeriod } },
        { fromDate: { $lte: endPeriod } },
      ],
    },
  ];

  if (currentUser.role.name === MANAGER) {
    filterConditions.push({ assignedUser: currentUserId });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const leaveRequests = await LeaveRequest.find(filterCriteria);

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const totalLeaveByMonth = Array.from({ length: 12 }, (_, month) => ({
    label: monthLabels[month],
    data: 0,
  }));

  for (let month = 1; month <= 12; month++) {
    let daysTakenNextMonth = 0;
    const totalLeaveTakenInMonth = leaveRequests.reduce(
      (total, leaveRequest) => {
        let fromDate = new Date(leaveRequest.fromDate);
        fromDate = new Date(fromDate.toUTCString());
        let toDate = new Date(leaveRequest.toDate);
        toDate = new Date(toDate.toUTCString());

        if (fromDate.getMonth() === month - 1) {
          if (fromDate.getMonth() === toDate.getMonth()) {
            total += leaveRequest.totalDays;
          } else {
            const isFullDay = leaveRequest.type === "full";
            const daysTaken =
              new Date(year, month, 0).getDate() - fromDate.getDate() + 1;
            total += isFullDay ? daysTaken : daysTaken * 0.5;
            daysTakenNextMonth +=
              toDate.getDate() - new Date(year, month, 1).getDate() + 1;
          }
        }
        return total;
      },
      0
    );

    totalLeaveByMonth[month - 1].label = monthLabels[month - 1];
    totalLeaveByMonth[month - 1].data += totalLeaveTakenInMonth;

    const nextMonthIndex = month % 12;
    if (month !== 12) {
      totalLeaveByMonth[nextMonthIndex].data += daysTakenNextMonth;
    }
    totalApprovedLeave += totalLeaveTakenInMonth + daysTakenNextMonth;
  }

  // Response
  return sendResponse(
    res,
    200,
    true,
    { totalLeaveByMonth, totalApprovedLeave },
    null,
    "Get Leave By Month Successfully"
  );
});

module.exports = leaveController;
