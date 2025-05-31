const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plain text)
 * @param {string} options.html - Email message (HTML) - optional
 */
exports.sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Define email options
  const mailOptions = {
    from: `Altaro Cloud Backup <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);
  
  return info;
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Password reset URL
 */
exports.sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset - Altaro Cloud Backup';
  const message = `You are receiving this email because you (or someone else) has requested to reset your password. 
  Please click on the following link to complete the process: ${resetUrl}
  This link will expire in 10 minutes.
  If you did not request this, please ignore this email and your password will remain unchanged.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2c3e50; text-align: center;">Altaro Cloud Backup</h2>
      <h3 style="color: #3498db;">Password Reset Request</h3>
      <p>You are receiving this email because you (or someone else) has requested to reset your password.</p>
      <p>Please click on the following link to complete the process:</p>
      <p><a href="${resetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p style="color: #7f8c8d; font-size: 0.9em;">This link will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #7f8c8d; font-size: 0.8em; text-align: center;">Altaro Cloud Backup - Secure Your Data</p>
    </div>
  `;
  
  return this.sendEmail({ email, subject, message, html });
};

/**
 * Send renewal reminder email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} plan - Subscription plan
 * @param {number} amount - Renewal amount
 * @param {Date} dueDate - Renewal due date
 */
exports.sendRenewalReminder = async (email, name, plan, amount, dueDate) => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  const formattedAmount = new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD' 
  }).format(amount);
  
  const subject = 'Subscription Renewal Reminder - Altaro Cloud Backup';
  const message = `Hello ${name},
  
  This is a friendly reminder that your Altaro Cloud Backup ${plan} subscription is due for renewal on ${formattedDate}.
  
  Subscription details:
  - Plan: ${plan}
  - Amount: ${formattedAmount}
  - Due date: ${formattedDate}
  
  To ensure uninterrupted service, please log in to your account and process the renewal payment before the due date.
  
  Thank you for choosing Altaro Cloud Backup.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2c3e50; text-align: center;">Altaro Cloud Backup</h2>
      <h3 style="color: #3498db;">Subscription Renewal Reminder</h3>
      <p>Hello ${name},</p>
      <p>This is a friendly reminder that your Altaro Cloud Backup <strong>${plan}</strong> subscription is due for renewal on <strong>${formattedDate}</strong>.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #2c3e50;">Subscription Details</h4>
        <p style="margin: 5px 0;"><strong>Plan:</strong> ${plan}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
        <p style="margin: 5px 0;"><strong>Due date:</strong> ${formattedDate}</p>
      </div>
      
      <p>To ensure uninterrupted service, please log in to your account and process the renewal payment before the due date.</p>
      <p><a href="${process.env.CLIENT_URL}/renewals" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Your Renewal</a></p>
      
      <p>Thank you for choosing Altaro Cloud Backup.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #7f8c8d; font-size: 0.8em; text-align: center;">Altaro Cloud Backup - Secure Your Data</p>
    </div>
  `;
  
  return this.sendEmail({ email, subject, message, html });
};

/**
 * Send payment confirmation email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} plan - Subscription plan
 * @param {number} amount - Payment amount
 * @param {Date} expiryDate - New expiry date
 */
exports.sendPaymentConfirmation = async (email, name, plan, amount, expiryDate) => {
  const formattedExpiryDate = new Date(expiryDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  const formattedAmount = new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD' 
  }).format(amount);
  
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  const subject = 'Payment Confirmation - Altaro Cloud Backup';
  const message = `Hello ${name},
  
  Thank you for your payment. We have successfully processed your subscription renewal.
  
  Payment details:
  - Plan: ${plan}
  - Amount: ${formattedAmount}
  - Payment date: ${today}
  - New expiry date: ${formattedExpiryDate}
  
  Your subscription has been renewed and your service will continue uninterrupted.
  
  Thank you for choosing Altaro Cloud Backup.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2c3e50; text-align: center;">Altaro Cloud Backup</h2>
      <h3 style="color: #27ae60;">Payment Confirmation</h3>
      <p>Hello ${name},</p>
      <p>Thank you for your payment. We have successfully processed your subscription renewal.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #2c3e50;">Payment Details</h4>
        <p style="margin: 5px 0;"><strong>Plan:</strong> ${plan}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
        <p style="margin: 5px 0;"><strong>Payment date:</strong> ${today}</p>
        <p style="margin: 5px 0;"><strong>New expiry date:</strong> ${formattedExpiryDate}</p>
      </div>
      
      <p>Your subscription has been renewed and your service will continue uninterrupted.</p>
      <p><a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
      
      <p>Thank you for choosing Altaro Cloud Backup.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #7f8c8d; font-size: 0.8em; text-align: center;">Altaro Cloud Backup - Secure Your Data</p>
    </div>
  `;
  
  return this.sendEmail({ email, subject, message, html });
};

/**
 * Send backup status notification email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} backupName - Backup name
 * @param {string} status - Backup status
 * @param {string} details - Additional details
 */
exports.sendBackupStatusNotification = async (email, name, backupName, status, details = '') => {
  let statusColor, statusText;
  
  switch (status) {
    case 'success':
      statusColor = '#27ae60';
      statusText = 'Completed Successfully';
      break;
    case 'failed':
      statusColor = '#e74c3c';
      statusText = 'Failed';
      break;
    case 'running':
      statusColor = '#3498db';
      statusText = 'Started';
      break;
    default:
      statusColor = '#7f8c8d';
      statusText = status;
  }
  
  const subject = `Backup ${statusText} - Altaro Cloud Backup`;
  const message = `Hello ${name},
  
  Your backup "${backupName}" has ${statusText.toLowerCase()}.
  
  Backup details:
  - Name: ${backupName}
  - Status: ${statusText}
  - Time: ${new Date().toLocaleString()}
  ${details ? `- Additional information: ${details}` : ''}
  
  You can view more details by logging into your account.
  
  Thank you for using Altaro Cloud Backup.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2c3e50; text-align: center;">Altaro Cloud Backup</h2>
      <h3 style="color: ${statusColor};">Backup ${statusText}</h3>
      <p>Hello ${name},</p>
      <p>Your backup "<strong>${backupName}</strong>" has ${statusText.toLowerCase()}.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #2c3e50;">Backup Details</h4>
        <p style="margin: 5px 0;"><strong>Name:</strong> ${backupName}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        ${details ? `<p style="margin: 5px 0;"><strong>Additional information:</strong> ${details}</p>` : ''}
      </div>
      
      <p>You can view more details by logging into your account.</p>
      <p><a href="${process.env.CLIENT_URL}/backups" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Backups</a></p>
      
      <p>Thank you for using Altaro Cloud Backup.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #7f8c8d; font-size: 0.8em; text-align: center;">Altaro Cloud Backup - Secure Your Data</p>
    </div>
  `;
  
  return this.sendEmail({ email, subject, message, html });
};
