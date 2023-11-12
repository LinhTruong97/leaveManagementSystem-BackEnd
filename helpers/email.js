const nodemailer = require("nodemailer");
const { catchAsync, sendResponse } = require("./utils");

const sendEmail = async (toEmail, fullName, link) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
      clientId: process.env.OAUTH_CLIENTID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    },
  });

  let mailOptions = {
    from: process.env.MAIL_USERNAME,
    to: toEmail,
    subject: "[IMPORTANT] Set up account",
    html: `
      <p>Dear ${fullName},</p>
      <br/>
      <p>Congratulations on joining our company! We are excited to have you on board.</p>
      <p>To get started, please visit this <a href=${link}>link</a> to set up your account.</p>
      <p>If you have any questions or encounter any issues during the process, please don't hesitate to contact me.</p>
      <br/>
      <p>Best regards,</p>
      <p>Admin Office</p>
   `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
