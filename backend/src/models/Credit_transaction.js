import mongoose, { Schema } from 'mongoose';

const creditTransactionSchema = new mongoose.Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
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
  description: {
    type: String,
    required: true
  },

}, {
  // CRITICAL: Connects to your existing specific collection name
  collection: 'credit_transaction',
  timestamps: true
});

const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);

export default CreditTransaction;