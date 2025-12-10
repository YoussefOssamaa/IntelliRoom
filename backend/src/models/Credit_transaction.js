const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  transaction_id: {
    type: Number,
    required: true,
    unique: true, // Corresponds to the unique index in your metadata
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  amount: {
    type: Number, // Mongoose uses Number for doubles/floats
    required: true,
    min: [0.01, 'Amount must be greater than zero']
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ['spent', 'earned'],
      message: '{VALUE} is not supported. Must be strictly "spent" or "earned"'
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now // Optional: defaults to current time if not provided
  },
  description: {
    type: String,
    required: true
  }
}, {
  // CRITICAL: Connects to your existing specific collection name
  collection: 'credit_transaction',
  timestamps: false
});

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);