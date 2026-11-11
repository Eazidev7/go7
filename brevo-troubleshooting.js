/**
 * 🔍 Brevo API Key Troubleshooting Guide
 * Comprehensive debugging for API key issues
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                   🚨 BREVO API KEY TROUBLESHOOTING              ║
╚══════════════════════════════════════════════════════════════════╝

🔍 ISSUE: Both old and new API keys are returning 401 "Key not found"

📋 POSSIBLE CAUSES & SOLUTIONS:

1️⃣ ACCOUNT VERIFICATION ISSUE
   • Go to https://app.brevo.com/
   • Check if your account needs email verification
   • Look for any warning banners or notifications
   • Verify your account is fully activated

2️⃣ API KEY PERMISSIONS
   • In Brevo dashboard → Settings → API Keys
   • Make sure the API key has "Send emails" permission enabled
   • Delete old keys and create a fresh one
   • Copy the ENTIRE key (including any dashes or special chars)

3️⃣ ACCOUNT SUSPENSION/LIMITS
   • Check if your Brevo account is in good standing
   • Verify you haven't exceeded sending limits
   • Look for any account restrictions

4️⃣ ALTERNATIVE EMAIL PROVIDERS
   Since Brevo is having issues, consider these alternatives:

   A) RESEND (Recommended - Easy setup)
      • Go to https://resend.com/
      • Free tier: 3,000 emails/month
      • Much simpler API
      • Better reliability

   B) SENDGRID
      • Go to https://sendgrid.com/
      • Free tier: 100 emails/day
      • Twilio-backed service

   C) NODEMAILER with GMAIL
      • Use your Gmail account
      • App-specific password
      • Totally free option

🛠️  IMMEDIATE ACTIONS:

1. Log into Brevo dashboard and check account status
2. Try creating one more fresh API key
3. If still failing, we'll switch to Resend (much easier!)

🎯 GOAL: Get email notifications working today!
`);

console.log('\n🤔 Would you like me to:');
console.log('   A) Help you try one more Brevo API key');
console.log('   B) Switch to Resend.com (recommended - much easier)');
console.log('   C) Set up Gmail SMTP (free but more complex)');
console.log('');
console.log('💡 Resend.com is the most reliable option and takes 2 minutes to set up!');