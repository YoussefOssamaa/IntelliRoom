import User from '../models/user.js';

export const requireCredits = (amount) => {
  return async (req, res, next) => {
    try {
      // The protect middleware sets req.userId
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (user.credits < amount) {
        return res.status(402).json({ success: false, message: 'Payment Required: Insufficient credits. Please top up your account.' });
      }

      req.userCredits = user.credits;
      next();
    } catch (error) {
      console.error('Credit Middleware Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error during credit check.' });
    }
  };
};
