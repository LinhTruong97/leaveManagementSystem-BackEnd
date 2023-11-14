const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const leaveRequestSchema = Schema(
  {
    requestedUser: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    assignedUser: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    category: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "LeaveCategory",
    },
    fromDate: { type: Date, require: true },
    toDate: { type: Date, require: true },
    type: {
      type: String,
      require: true,
      enum: ["full", "half_morning", "half_afternoon"],
    },
    totalDays: { type: Number },
    reason: { type: String, require: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

module.exports = LeaveRequest;
