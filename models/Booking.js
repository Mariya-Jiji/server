const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: String,
  phone: String,
  location: String,
  date: String,
  time: String,
  serviceType: String,
  status: { type: String, default: 'pending' },
  cancellationFee: { type: Number, default: 0 },
  cancellationFeeConfirmed: { type: Boolean, default: false },
  workDescription: String,
  amount: Number,
  paymentDone: { type: Boolean, default: false },
  paymentMethod: String,
  review: String,
  rating: Number,
  // Provider real-time tracking fields
  trackingEnabled: { type: Boolean, default: false },
  providerCurrentLatitude: Number,
  providerCurrentLongitude: Number,
  lastLocationUpdate: Date
}, { timestamps: true });
module.exports = mongoose.model('Booking', BookingSchema);