import TrafficSession from '../../models/ecommerceModels/TrafficSessionModel.js';

// Called by frontend when a user first lands on the site
export const startSession = async (req, res) => {
  try {
    const { sessionId, source, landingPage, userAgent } = req.body;
    
    // Optional: Get user ID if they are logged in
    const userId = req.user ? req.user._id : null;

    const session = await TrafficSession.create({
      sessionId,
      user: userId,
      source: source || 'direct',
      landingPage,
      userAgent
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Called by frontend periodically (e.g. every 30s) or on beforeunload to update duration
export const updateSessionPing = async (req, res) => {
  try {
    const { sessionId, durationStr, clickedLink } = req.body;

    const updateData = {
      $inc: { duration: 30 }, // Increment by 30 seconds
    };

    // If they clicked a link, they didn't bounce
    if (clickedLink) {
      updateData.$set = { bounced: false };
    }

    await TrafficSession.findOneAndUpdate(
      { sessionId },
      updateData
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};