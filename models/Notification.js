const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema({}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
