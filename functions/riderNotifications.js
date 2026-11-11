/**
 * Rider application emails — uses same Resend path as delivery booking emails.
 */
const { defineString } = require('firebase-functions/params');
const { sendNotificationEmail, WORKING_FROM } = require('./resendClient');

const APP_BASE_URL = defineString('APP_BASE_URL', { default: 'https://go7-app-209e4.web.app' });

const fleetLabel = (fleetType) => {
  if (fleetType === 'rider') return 'Motorcycle / Scooter';
  if (fleetType === 'bicycle') return 'Bicycle';
  if (fleetType === 'leg-fleet') return 'Leg Fleet (Walking)';
  return 'Delivery Rider';
};

const docLinks = (rider) => {
  const items = [];
  const add = (label, url) => { if (url) items.push({ label, url }); };
  add('Profile Photo', rider.profilePhoto || rider.photoURL);
  add('ID Document', rider.idDocumentURL || rider.idFileURL || rider.idCard);
  add('License Photo', rider.licensePhotoURL);
  add('Vehicle Photo', rider.vehiclePhotoURL);
  return items;
};

async function getAdminEmails(firestore) {
  const emails = new Set(['feyisetantobiloba@gmail.com', '7linkz01@gmail.com']);
  try {
    const snap = await firestore.collection('users').where('role', '==', 'admin').get();
    snap.forEach((d) => {
      const e = d.data().email;
      if (e && typeof e === 'string') emails.add(e.trim());
    });
  } catch (err) {
    console.warn('Could not load admin emails:', err.message);
  }
  return [...emails];
}

function adminAlertHtml(rider, riderId, isResubmit) {
  const name = rider.name || rider.fullName || 'New Rider';
  const docs = docLinks(rider);
  const docRows = docs.length
    ? docs.map((d) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">${d.label}</td>
          <td style="padding:8px 0;font-size:14px;">
            <a href="${d.url}" style="color:#E0001B;font-weight:600;">View document</a>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:8px 0;color:#92400e;font-size:14px;">No document URLs saved yet — rider may need to re-upload.</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#E0001B,#B30016);border-radius:12px 12px 0 0;padding:28px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🛵</div>
      <h1 style="color:#fff;margin:0;font-size:22px;">${isResubmit ? 'Rider Re-submitted Application' : 'New Rider Application'}</h1>
      <p style="color:#ffd6d9;margin:8px 0 0;font-size:14px;">Action required — review in admin panel</p>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;">
      <p style="color:#374151;font-size:15px;line-height:1.6;">
        A rider application ${isResubmit ? 'has been updated and resubmitted' : 'is awaiting your approval'}.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9fafb;border-radius:8px;padding:16px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:38%;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;font-weight:600;">${rider.phone || '—'}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;font-weight:600;">${rider.email || '—'}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Fleet</td><td style="padding:8px 0;font-weight:600;">${fleetLabel(rider.fleetType || rider.vehicleType)}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Plate</td><td style="padding:8px 0;">${rider.plateNumber || '—'}</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Rider ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${riderId}</td></tr>
      </table>
      <h3 style="font-size:14px;color:#111827;margin:0 0 12px;">Uploaded Documents</h3>
      <table style="width:100%;border-collapse:collapse;">${docRows}</table>
      <div style="text-align:center;margin-top:28px;">
        <a href="${APP_BASE_URL.value()}/admin/riders"
           style="display:inline-block;background:#E0001B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">
          Open Admin Panel → Riders
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">Go7 Logistics — automated admin notification</p>
  </div>
</body>
</html>`;
}

function riderReuploadHtml(riderName, registerUrl, phone = '') {
  const phoneNote = phone
    ? `Use the same phone number you registered with (<strong>${phone}</strong>).`
    : 'Use the same phone number you originally registered with.';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#E0001B,#B30016);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🏍️</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Action Required: Complete Your Rider Application</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="color:#111827;font-size:16px;margin:0 0 16px;">Dear <strong>${riderName}</strong>,</p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Thank you for your interest in joining <strong>Go7 Logistics</strong> as a delivery rider.
        We received your registration, but your application documents were not fully saved on our system due to a technical issue on our end — this has now been resolved.
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
        To complete your application, please <strong>log in with your registered phone number</strong> and re-upload the following:
      </p>
      <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>Profile photo</li>
        <li>Government-issued ID (NIN, Voter's card, or Driver's license)</li>
        <li>Driver's license photo (if applicable)</li>
        <li>Vehicle photo</li>
      </ul>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          <strong>Important:</strong> Do not create a new account. ${phoneNote}
        </p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${registerUrl}"
           style="display:inline-block;background:#E0001B;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;">
          Complete My Application
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
        Once submitted, our team will review your application within <strong>24–48 hours</strong>.
        If you need assistance, reply to this email or contact Go7 support.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
        Warm regards,<br><strong>The Go7 Logistics Team</strong><br>
        <a href="https://go7-app-209e4.web.app" style="color:#E0001B;">go7-app-209e4.web.app</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function notifyAdminsRiderApplication(firestore, riderId, rider, isResubmit = false) {
  const adminEmails = await getAdminEmails(firestore);
  const name = rider.name || rider.fullName || 'Rider';
  const subject = `${isResubmit ? '🔄 Rider Re-submitted' : '🛵 New Rider Application'} — ${name} (Review Required)`;
  const html = adminAlertHtml(rider, riderId, isResubmit);

  await sendNotificationEmail({ to: adminEmails, subject, html });
  console.log(`✅ Admin rider alert sent to: ${adminEmails.join(', ')}`);
}

function riderApprovalHtml(riderName, loginUrl) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#059669,#047857);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">✅</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">You're Approved!</h1>
      <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Welcome to the Go7 rider fleet</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi <strong>${riderName}</strong>,</p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Great news — your Go7 rider application has been <strong>approved</strong>.
        You can now log in, go online, and start accepting delivery jobs.
      </p>
      <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#065f46;font-size:14px;line-height:1.6;">
          <strong>Next steps:</strong><br>
          1. Open the rider app and sign in<br>
          2. Tap <strong>Go Online</strong><br>
          3. Accept deliveries and start earning
        </p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${loginUrl}"
           style="display:inline-block;background:#E0001B;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;">
          Open Rider Dashboard
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;text-align:center;">
        Need help? Email <strong>support@go7.ng</strong>
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">Go7 Logistics — automated message</p>
  </div>
</body>
</html>`;
}

async function sendRiderApprovalEmail(toEmail, riderName, riderId) {
  if (!toEmail) {
    console.log(`⚠️ Rider ${riderId} has no email — skipping approval email`);
    return null;
  }

  const loginUrl = `${APP_BASE_URL.value()}/rider/login`;
  const html = riderApprovalHtml(riderName || 'Rider', loginUrl);
  const subject = `🎉 Approved — Welcome to Go7, ${riderName || 'Rider'}!`;

  await sendNotificationEmail({ to: toEmail, subject, html });
  console.log(`✅ Rider approval email sent to ${toEmail} (${riderId})`);
  return true;
}

async function sendRiderReuploadRequestEmail(toEmail, riderName, registerUrl, phone = '', cc = []) {
  const html = riderReuploadHtml(riderName, registerUrl, phone);
  const subject = 'Go7 Logistics — Please Complete Your Rider Application';

  // Primary email to rider (no CC — university inboxes often block CC from bulk senders)
  const riderResult = await sendNotificationEmail({
    to: toEmail,
    subject,
    html,
  });

  // Separate admin copies (same path as delivery confirmation emails)
  const adminCopyTo = [...new Set(
    ['feyisetantobiloba@gmail.com', ...(Array.isArray(cc) ? cc : [])]
      .map((e) => String(e || '').trim())
      .filter((e) => e.includes('@') && e.toLowerCase() !== String(toEmail).toLowerCase())
  )];

  for (const adminEmail of adminCopyTo) {
    try {
      await sendNotificationEmail({
        to: adminEmail,
        subject: `[Admin copy] ${subject} — ${riderName}`,
        html: `<p style="font-family:sans-serif;color:#666;font-size:14px">Rider email: <strong>${toEmail}</strong> | Phone: ${phone || '—'}</p>${html}`,
      });
    } catch (err) {
      console.warn(`Admin copy to ${adminEmail} failed:`, err.message);
    }
  }

  console.log(`✅ Re-upload request sent to ${toEmail} via ${WORKING_FROM}`);
  return riderResult;
}

module.exports = {
  notifyAdminsRiderApplication,
  sendRiderApprovalEmail,
  sendRiderReuploadRequestEmail,
  adminAlertHtml,
  riderApprovalHtml,
  riderReuploadHtml,
  getAdminEmails,
};
