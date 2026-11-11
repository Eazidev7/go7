/**
 * Thin wrapper — delegates to resendClient (same path as delivery emails).
 */
const { sendNotificationEmail, getResend, WORKING_FROM } = require('./resendClient');

async function sendGo7Email(opts) {
  try {
    const result = await sendNotificationEmail(opts);
    return { success: true, id: result.id, from: result.from, attempts: [] };
  } catch (err) {
    return { success: false, error: err.message, attempts: [err.message] };
  }
}

function getApiKey() {
  return getResend() ? 'configured' : null;
}

module.exports = {
  sendGo7Email,
  getApiKey,
  getClient: getResend,
  FROM_CANDIDATES: [WORKING_FROM],
};
