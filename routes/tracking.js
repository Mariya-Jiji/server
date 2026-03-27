const router = require('express').Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

// Provider updates their real-time location during active booking
router.put('/location/:bookingId', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Verify the booking exists and the user is the provider
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found.' });
    
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized: You are not the provider for this booking.' });
    }

    // Only allow location updates for active bookings
    if (booking.status !== 'accepted') {
      return res.status(400).json({ msg: 'Location tracking only available for accepted bookings.' });
    }

    // Update booking with provider's current location
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      {
        providerCurrentLatitude: latitude,
        providerCurrentLongitude: longitude,
        lastLocationUpdate: new Date()
      },
      { new: true }
    ).populate('provider', 'name phone');

    res.json({
      success: true,
      message: 'Location updated successfully',
      booking: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Customer retrieves provider's real-time location for a booking
router.get('/location/:bookingId', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('provider', 'name phone');
    
    if (!booking) return res.status(404).json({ msg: 'Booking not found.' });
    
    // Verify the user is either the customer or the provider
    if (booking.customer.toString() !== req.user.id && booking.provider._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized: Access denied.' });
    }

    // Only show location for accepted bookings
    if (booking.status !== 'accepted') {
      return res.json({
        success: true,
        hasLocation: false,
        message: 'Tracking not available for this booking status'
      });
    }

    // Return provider's current location if available
    if (booking.providerCurrentLatitude && booking.providerCurrentLongitude) {
      return res.json({
        success: true,
        hasLocation: true,
        providerName: booking.provider.name,
        latitude: booking.providerCurrentLatitude,
        longitude: booking.providerCurrentLongitude,
        lastUpdate: booking.lastLocationUpdate,
        destinationLatitude: booking.latitude,
        destinationLongitude: booking.longitude
      });
    } else {
      return res.json({
        success: true,
        hasLocation: false,
        message: 'Provider has not shared location yet'
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Provider enables/disables tracking for a booking
router.put('/toggle/:bookingId', auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found.' });
    
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized: You are not the provider for this booking.' });
    }

    if (booking.status !== 'accepted') {
      return res.status(400).json({ msg: 'Can only toggle tracking for accepted bookings.' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { trackingEnabled: enabled },
      { new: true }
    );

    res.json({
      success: true,
      message: `Location tracking ${enabled ? 'enabled' : 'disabled'}`,
      booking: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
