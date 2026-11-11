require("dotenv").config();
const axios = require("axios");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Sends an email through Brevo (Sendinblue) API
 * @param {Object} data - Email data
 * @param {string} data.to - Recipient email address
 * @param {string} data.subject - Email subject line
 * @param {string} data.htmlContent - HTML content of the email
 * @param {string} [data.name] - Recipient name (optional)
 * @returns {Promise<Object>} Response from Brevo API
 */
async function sendEmail({ to, subject, htmlContent, name = "" }) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured in environment variables");
  }

  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: { 
          name: "Go7 Delivery", 
          email: "support@go7.ng" 
        },
        to: [{ 
          email: to,
          name: name 
        }],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Email sent successfully to ${to}:`, response.data);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error("❌ Email send error:", error.response?.data || error.message);
    throw new Error(`Failed to send email: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = { sendEmail };
