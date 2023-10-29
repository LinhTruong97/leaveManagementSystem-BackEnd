const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const leaveCategorySchema = Schema(
  {
    name: {
      type: String,
      require: true,
    },
    targetType: { type: String, require: true, enum: ["All", "Role"] },
    targetRole: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
    totalDays: { type: Number },
    displayOrder: { type: Number },
  },
  { timestamp: true }
);

const LeaveCategory = mongoose.model("LeaveCategory", leaveCategorySchema);

module.exports = LeaveCategory;
