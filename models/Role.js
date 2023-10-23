const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const roleSchema = Schema(
  {
    name: {
      type: String,
      require: true,
      enum: ["employee", "manager", "admin office"],
    },
    roleId: {
      type: Number,
      require: true,
      enum: ["1", "2", "3"],
    },
  },
  { timestamp: true }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
