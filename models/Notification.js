const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = Schema({}, { timestamp: true });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
