const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema(
  {
    targetUser: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    leaveRequest: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "LeaveRequest",
    },
    type: {
      type: String,
      enum: ["leave_submit", "leave_approve", "leave_reject"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
