const ADMIN_OFFICE = "admin_office";
const MANAGER = "manager";
const EMPLOYEE = "employee";

const NOTIFICATION_SUBMIT_LEAVE = (name) => {
  return `New leave request from ${name} has been submitted.`;
};

module.exports = {
  ADMIN_OFFICE,
  MANAGER,
  EMPLOYEE,
  NOTIFICATION_SUBMIT_LEAVE,
};
