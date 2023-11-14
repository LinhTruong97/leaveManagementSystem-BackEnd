const ADMIN_OFFICE = "admin_office";
const MANAGER = "manager";
const EMPLOYEE = "employee";

const NOTIFICATION_SUBMIT_LEAVE = (name) => {
  return `New leave request from ${name} has been submitted.`;
};

const NOTIFICATION_APPROVE_LEAVE = "Your leave request has been approved.";

const NOTIFICATION_REJECT_LEAVE = "Your leave request has been rejected.";

module.exports = {
  ADMIN_OFFICE,
  MANAGER,
  EMPLOYEE,
  NOTIFICATION_SUBMIT_LEAVE,
  NOTIFICATION_REJECT_LEAVE,
};
