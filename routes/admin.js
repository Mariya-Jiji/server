const router = require('express').Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

// Middleware: admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
  next();
};

// Get all providers
router.get('/providers', auth, adminOnly, async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).sort({ createdAt: -1 });
    res.json(providers);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Approve or reject provider
router.put('/providers/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { action } = req.body; // 'approve', 'reject', 'revoke'
    let status;
    if (action === 'approve') status = 'approved';
    else if (action === 'reject') status = 'rejected';
    else if (action === 'revoke') status = 'pending';
    else return res.status(400).json({ msg: 'Invalid action' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'Provider not found' });

    const oldStatus = user.status;
    user.status = status;

    let message = '';
    if (action === 'approve') message = 'Your provider account has been approved. You can now accept bookings.';
    else if (action === 'reject') message = 'Your provider account has been rejected. Please contact support for more information.';
    else if (action === 'revoke') message = 'Your provider approval has been revoked. Your account is now pending review.';

    if (message) {
      user.notifications.push({ message, date: new Date(), read: false });
    }

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all bookings
router.get('/bookings', auth, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 })
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get provider revenue summary
router.get('/provider-revenue', auth, adminOnly, async (req, res) => {
  try {
    const paidBookings = await Booking.find({ status: 'paid' })
      .populate('provider', 'name email phone');

    const revenueMap = {};
    paidBookings.forEach(b => {
      if (!b.provider) return;
      const id = b.provider._id.toString();
      if (!revenueMap[id]) {
        revenueMap[id] = {
          provider: b.provider,
          totalAmount: 0,
          bookingCount: 0,
          bookings: []
        };
      }
      revenueMap[id].totalAmount += b.amount || 0;
      revenueMap[id].bookingCount += 1;
      revenueMap[id].bookings.push({
        date: b.date,
        serviceType: b.serviceType,
        amount: b.amount,
        workDescription: b.workDescription,
        paymentMethod: b.paymentMethod
      });
    });

    res.json(Object.values(revenueMap));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;