const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { sendVendorApproved } = require('../controllers/emailController');

const db = admin.firestore();

/**
 * Register a new vendor
 * POST /api/vendors/register
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      name,
      businessName,
      phone,
      address,
      category,
      description,
    } = req.body;

    // Validate required fields
    if (!email || !name || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, name, businessName',
      });
    }

    // Generate vendor ID
    const vendorId = `VENDOR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create vendor document
    const vendorData = {
      id: vendorId,
      email,
      name,
      businessName,
      phone: phone || '',
      address: address || '',
      category: category || 'general',
      description: description || '',
      status: 'pending', // pending, approved, rejected
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('vendors').doc(vendorId).set(vendorData);

    console.log(`✅ Vendor registered: ${vendorId} (Pending approval)`);

    res.status(201).json({
      success: true,
      message: 'Vendor registration submitted. Awaiting approval.',
      vendor: {
        id: vendorId,
        ...vendorData,
      },
    });
  } catch (error) {
    console.error('❌ Vendor registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register vendor',
      error: error.message,
    });
  }
});

/**
 * Approve/Reject vendor
 * PATCH /api/vendors/:vendorId/status
 */
router.patch('/:vendorId/status', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (approved or rejected)',
      });
    }

    const vendorRef = db.collection('vendors').doc(vendorId);
    const vendorDoc = await vendorRef.get();

    if (!vendorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const vendorData = vendorDoc.data();

    // Update vendor status
    await vendorRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedAt: status === 'approved' ? admin.firestore.FieldValue.serverTimestamp() : null,
    });

    console.log(`✅ Vendor ${vendorId} status updated to: ${status}`);

    // Send approval email if approved
    if (status === 'approved') {
      try {
        await sendVendorApproved({
          email: vendorData.email,
          name: vendorData.businessName || vendorData.name,
        });
        console.log(`📧 Vendor approval email sent to ${vendorData.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send vendor approval email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Vendor ${status} successfully`,
      vendor: {
        id: vendorId,
        ...vendorData,
        status,
      },
    });
  } catch (error) {
    console.error('❌ Update vendor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor status',
      error: error.message,
    });
  }
});

/**
 * Get vendor by ID
 * GET /api/vendors/:vendorId
 */
router.get('/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendorDoc = await db.collection('vendors').doc(vendorId).get();

    if (!vendorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    res.status(200).json({
      success: true,
      vendor: {
        id: vendorId,
        ...vendorDoc.data(),
      },
    });
  } catch (error) {
    console.error('❌ Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor',
      error: error.message,
    });
  }
});

/**
 * Get all vendors (with optional status filter)
 * GET /api/vendors?status=approved
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = db.collection('vendors');

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const vendors = [];
    snapshot.forEach((doc) => {
      vendors.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error('❌ Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendors',
      error: error.message,
    });
  }
});

module.exports = router;
