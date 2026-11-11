const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const { sendPasswordReset } = require('../controllers/emailController');

const db = admin.firestore();

/**
 * Request password reset
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if user exists
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();

    if (usersSnapshot.empty) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset token to Firestore
    await db.collection('passwordResets').doc(resetToken).set({
      userId: userData.uid,
      email: email,
      token: resetToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: resetTokenExpiry,
      used: false,
    });

    // Generate reset link (adjust domain for production)
    const resetLink = `https://go7.ng/reset-password?token=${resetToken}`;
    // For development:
    // const resetLink = `http://localhost:9999/reset-password?token=${resetToken}`;

    console.log(`🔐 Password reset requested for: ${email}`);
    console.log(`🔗 Reset link: ${resetLink}`);

    // Send password reset email
    try {
      await sendPasswordReset({
        email: email,
        name: userData.name || 'User',
        resetLink: resetLink,
      });
      console.log(`📧 Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      throw new Error('Failed to send reset email');
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // For development only - remove in production:
      devResetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
    });
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message,
    });
  }
});

/**
 * Verify reset token
 * GET /api/auth/verify-reset-token/:token
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const tokenDoc = await db.collection('passwordResets').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const tokenData = tokenDoc.data();

    // Check if token is expired
    if (new Date() > tokenData.expiresAt.toDate()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired',
      });
    }

    // Check if token has been used
    if (tokenData.used) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has already been used',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      email: tokenData.email,
    });
  } catch (error) {
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset token',
      error: error.message,
    });
  }
});

/**
 * Reset password with token
 * POST /api/auth/confirm-reset-password
 */
router.post('/confirm-reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const tokenDoc = await db.collection('passwordResets').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const tokenData = tokenDoc.data();

    // Check if token is expired
    if (new Date() > tokenData.expiresAt.toDate()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired',
      });
    }

    // Check if token has been used
    if (tokenData.used) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has already been used',
      });
    }

    // Update password in Firebase Auth
    try {
      await admin.auth().updateUser(tokenData.userId, {
        password: newPassword,
      });

      console.log(`✅ Password reset successful for user: ${tokenData.userId}`);
    } catch (authError) {
      console.error('❌ Firebase Auth password update error:', authError);
      throw new Error('Failed to update password in authentication system');
    }

    // Mark token as used
    await db.collection('passwordResets').doc(token).update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('❌ Confirm password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
});

module.exports = router;
