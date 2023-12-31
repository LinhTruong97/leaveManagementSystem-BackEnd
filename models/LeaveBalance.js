const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const leaveBalanceSchema = Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    leaveCategory: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "LeaveCategory",
    },
    totalUsed: { type: Number },
    totalAvailable: { type: Number },
    expiredDate: { type: Date },
  },
  { timestamps: true }
);

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

module.exports = LeaveBalance;
