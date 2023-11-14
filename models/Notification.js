const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema(
  {
    targetUser: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
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
