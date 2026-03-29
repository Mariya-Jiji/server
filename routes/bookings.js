const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ... existing routes ...

// DEBUG endpoint - only for testing
router.get('/debug', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('notifications');
    const pendingFines = await Booking.countDocuments({
      customer: req.user.id,
      status: 'cancelled',
      cancellationFee: { $gt: 0 },
      cancellationFeeConfirmed: false
    });
    
    res.json({
      userFinePending: user.finePending,
      pendingFinesCount: pendingFines,
      userId: req.user.id,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Reset finePending (admin/debug only)
router.get('/debug', auth, async (req, res) => {
  if (req.query.reset === 'true') {
    try {
      const user = await User.findById(req.user.id);
      user.finePending = false;
      await user.save();
      res.json({ msg: 'finePending reset to false' });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  } else {
    // normal debug
    const user = await User.findById(req.user.id).populate('notifications');
    const pendingFines = await Booking.countDocuments({
      customer: req.user.id,
      status: 'cancelled',
      cancellationFee: { $gt: 0 },
      cancellationFeeConfirmed: false
    });
    
    res.json({
      userFinePending: user.finePending,
      pendingFinesCount: pendingFines,
      userId: req.user.id,
      role: user.role
    });
  }
});

module.exports = router;
