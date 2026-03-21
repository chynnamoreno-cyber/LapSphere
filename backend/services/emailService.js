const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;

// Initialize email transporter
function initEmailTransporter() {
  if (transporter) return transporter;

  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASSWORD || "",
    },
  };

  // Only initialize if email credentials are provided
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn(
      "[emailService] Email credentials not configured. Email notifications will be skipped. Set EMAIL_USER and EMAIL_PASSWORD."
    );
    return null;
  }

  try {
    transporter = nodemailer.createTransport(emailConfig);
    console.log("[emailService] Email transporter initialized successfully");
    return transporter;
  } catch (error) {
    console.error("[emailService] Failed to initialize email transporter:", error.message);
    return null;
  }
}

// Send order status update email
async function sendOrderStatusEmail(recipientEmail, recipientName, orderId, status, additionalInfo = {}) {
  try {
    const emailTransporter = initEmailTransporter();
    if (!emailTransporter) {
      console.log("[emailService] Email service not configured, skipping email notification");
      return false;
    }

    let statusMessage = "";
    let statusEmoji = "";

    switch (status) {
      case "confirmed":
      case "pending":
        statusMessage = "Your order has been confirmed and is being prepared for shipment.";
        statusEmoji = "✅";
        break;
      case "shipped":
        statusMessage = "Your order is on its way! You can track your delivery.";
        statusEmoji = "📦";
        break;
      case "delivered":
        statusMessage = "Your order has been delivered successfully. Thank you for your purchase!";
        statusEmoji = "🎉";
        break;
      case "cancelled":
        statusMessage = additionalInfo.reason
          ? `Your order has been cancelled. Reason: ${additionalInfo.reason}`
          : "Your order has been cancelled.";
        statusEmoji = "❌";
        break;
      default:
        statusMessage = `Your order status has been updated to: ${status}`;
        statusEmoji = "📧";
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #1e40af; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background: white; padding: 20px; border-radius: 0 0 5px 5px; }
            .status { font-size: 24px; font-weight: bold; color: #1e40af; margin: 20px 0; }
            .order-id { font-size: 14px; color: #666; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Order Status Update</h2>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <div class="status">${statusEmoji} ${status.toUpperCase()}</div>
              <p>${statusMessage}</p>
              <p class="order-id">Order ID: <strong>#${orderId}</strong></p>
              ${additionalInfo.trackingNumber ? `<p>Tracking Number: <strong>${additionalInfo.trackingNumber}</strong></p>` : ""}
              ${additionalInfo.estimatedDelivery ? `<p>Estimated Delivery: <strong>${additionalInfo.estimatedDelivery}</strong></p>` : ""}
              <a href="${process.env.APP_BASE_URL || "https://lapsphere.com"}/orders/${orderId}" class="button">View Order Details</a>
              <div class="footer">
                <p>© 2026 LapSphere. All rights reserved.</p>
                <p>If you didn't place this order, please contact support immediately.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@lapsphere.com",
      to: recipientEmail,
      subject: `${statusEmoji} Order #${orderId} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      html: htmlContent,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`[emailService] Email sent to ${recipientEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[emailService] Error sending email:", error.message);
    return false;
  }
}

// Send promo broadcast email
async function sendPromoEmail(recipientEmail, recipientName, promoTitle, promoMessage, promoImage = null) {
  try {
    const emailTransporter = initEmailTransporter();
    if (!emailTransporter) {
      console.log("[emailService] Email service not configured, skipping promo email");
      return false;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background: white; padding: 20px; border-radius: 0 0 5px 5px; }
            .promo-image { width: 100%; max-height: 300px; object-fit: cover; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎉 Special Offer!</h2>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <h3>${promoTitle}</h3>
              ${promoImage ? `<img src="${promoImage}" class="promo-image" alt="${promoTitle}" />` : ""}
              <p>${promoMessage}</p>
              <a href="${process.env.APP_BASE_URL || "https://lapsphere.com"}/shop" class="button">Shop Now</a>
              <div class="footer">
                <p>© 2026 LapSphere. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@lapsphere.com",
      to: recipientEmail,
      subject: `🎉 ${promoTitle}`,
      html: htmlContent,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`[emailService] Promo email sent to ${recipientEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[emailService] Error sending promo email:", error.message);
    return false;
  }
}

module.exports = {
  sendOrderStatusEmail,
  sendPromoEmail,
};
