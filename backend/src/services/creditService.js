import User from '../models/user.js';
import CreditTransaction from '../models/Credit_transaction.js';

export const deductCredits = async (userId, amount, description) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.credits < amount) {
    throw new Error('Insufficient credits');
  }

  user.credits -= amount;
  await user.save();

  // Generate a reasonably unique integer for transaction_id
  const transactionId = Math.floor(Date.now() * 1000 + Math.random() * 1000);

  const transaction = new CreditTransaction({
    user_id: userId,
    transaction_id: transactionId,
    amount: amount,
    type: 'spent',
    description: description
  });

  await transaction.save();

  return user;
};
