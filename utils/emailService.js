const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send payslip email
async function sendPayslipEmail(to, employeeName, month, payslipPath) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `Payslip for ${month}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Payslip for ${month}</h2>
          <p>Dear ${employeeName},</p>
          <p>Please find attached your payslip for the month of ${month}.</p>
          <p>If you have any questions regarding your payslip, please contact the HR department.</p>
          <br>
          <p>Best regards,<br>
          HR Department<br>
          ABC Corporation Pvt. Ltd.</p>
        </div>
      `,
      attachments: [
        {
          filename: `payslip_${month}.pdf`,
          path: payslipPath
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payslip email sent to ${to}`);
    return true;

  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send leave application notification
async function sendLeaveNotification(to, employeeName, leaveType, fromDate, toDate, status) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: `Leave Application ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Leave Application ${status}</h2>
          <p>Dear ${employeeName},</p>
          <p>Your leave application has been <strong>${status}</strong>.</p>
          <ul>
            <li><strong>Leave Type:</strong> ${leaveType}</li>
            <li><strong>From Date:</strong> ${fromDate}</li>
            <li><strong>To Date:</strong> ${toDate}</li>
          </ul>
          <p>If you have any questions, please contact the HR department.</p>
          <br>
          <p>Best regards,<br>
          HR Department<br>
          ABC Corporation Pvt. Ltd.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Leave notification sent to ${to}`);
    return true;

  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send welcome email
async function sendWelcomeEmail(to, employeeName, username, password) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: 'Welcome to ABC Corporation - Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Welcome to ABC Corporation!</h2>
          <p>Dear ${employeeName},</p>
          <p>Welcome to our team! Your employee account has been created successfully.</p>
          <p>Here are your login credentials:</p>
          <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p style="color: red;"><strong>Please change your password after first login.</strong></p>
          <p>You can access the system at: <a href="http://localhost:3000">http://localhost:3000</a></p>
          <br>
          <p>Best regards,<br>
          HR Department<br>
          ABC Corporation Pvt. Ltd.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return true;

  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

module.exports = {
  sendPayslipEmail,
  sendLeaveNotification,
  sendWelcomeEmail
};