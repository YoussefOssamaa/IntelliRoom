import User from "../../models/user.js";
import Subscription from "../../models/Subscription.js";
import Plan from "../../models/plan.js";
import Usage from "../../models/usage.js";

export const getUsersWithSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(query);

    const usersWithSubscriptions = await Promise.all(
      users.map(async (user) => {
        const subscription = await Subscription.findOne({
          userId: user._id,

          status: { $in: ["active", "trial", "past_due", "paused"] },
        }).populate("planId", "name price renderLimit model3DLimit");

        return {
          ...user,
          subscription: subscription || null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: usersWithSubscriptions,
      pagination: {
        total: totalUsers,
        page,
        pages: Math.ceil(totalUsers / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getUsersWithSubscriptions:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const suspendUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "paused", "trial"] },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active or paused subscription found for this user.",
      });
    }

    if (action === "pause") {
      if (subscription.status === "paused") {
        return res
          .status(400)
          .json({ success: false, message: "Subscription is already paused." });
      }
      subscription.status = "paused";
      await subscription.save();
      return res
        .status(200)
        .json({ success: true, message: "Subscription paused successfully." });
    }

    if (action === "resume") {
      if (subscription.status === "active") {
        return res
          .status(400)
          .json({ success: false, message: "Subscription is already active." });
      }
      subscription.status = "active";
      await subscription.save();
      return res
        .status(200)
        .json({ success: true, message: "Subscription resumed successfully." });
    }

    await logAdminAction(
      req.admin._id, 
      "SUSPEND_SUBSCRIPTION",
      userId, 
      `Suspended subscription`,
    );

    res.status(400).json({
      success: false,
      message: "Invalid action. Use 'pause' or 'resume'.",
    });
  } catch (error) {
    console.error("Error in suspendUserSubscription:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changeUserPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPlanId } = req.body;

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan) {
      return res
        .status(404)
        .json({ success: false, message: "New plan not found" });
    }

    const currentSubscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "trial", "paused"] },
    }).populate("planId");

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: "No current subscription found to change.",
      });
    }

    if (currentSubscription.planId._id.toString() === newPlanId) {
      return res
        .status(400)
        .json({ success: false, message: "User is already on this plan." });
    }

    currentSubscription.planId = newPlanId;

    currentSubscription.status = "active";
    await currentSubscription.save();

    const currentUsage = await Usage.findOne({
      subscriptionId: currentSubscription._id,
      periodEnd: { $gte: new Date() },
    });

    if (currentUsage) {
      currentUsage.remainingRenders = newPlan.renderLimit;
      await currentUsage.save();
    }

    await User.findByIdAndUpdate(userId, { plan: newPlan.name });
    await logAdminAction(
      req.admin._id, 
      "CHANGE_PLAN",
      userId, 
      `Changed plan to ${newPlan.name}`,
    );
    
    res.status(200).json({
      success: true,
      message: `Successfully changed user's plan to ${newPlan.name}`,
      data: currentSubscription,
    });
  } catch (error) {
    console.error("Error in changeUserPlan:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
