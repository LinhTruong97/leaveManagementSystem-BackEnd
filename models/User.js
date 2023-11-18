const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const userSchema = Schema(
  {
    userName: { type: String, require: true, default: "" },
    fullName: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true, select: false, default: null },
    role: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "Role",
    },
    status: {
      type: String,
      require: true,
      enum: ["pending", "active", "terminated"],
      default: "pending",
    },
    reportTo: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    birthday: { type: Date },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    currentFcmToken: { type: String },
    fcmTokens: [String],
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this._doc;
  delete user.password;
  return user;
};

userSchema.methods.generateAccessToken = async function () {
  const accessToken = await jwt.sign(
    { _id: this._id, currentFcmToken: this.currentFcmToken },
    JWT_SECRET_KEY,
    {
      expiresIn: "1d",
    }
  );
  return accessToken;
};

userSchema.methods.generateSetupToken = async function () {
  const setupToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
  return setupToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
