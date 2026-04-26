import User from "../../models/user.js";
import Subscription from "../../models/billing system/Subscription.js";
import Plan from "../../models/billing system/plan.js";
import Usage from "../../models/billing system/usage.js";

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
    const { planName } = req.body;

    if (!planName) {
      return res.status(400).json({ success: false, message: "Plan name is required" });
    }

    // ==========================================
    // 1. الحالة الوحيدة للـ 404: لو المستخدم مش موجود
    // ==========================================
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const normalizedPlanName = planName.toLowerCase();

    let planDetails = await Plan.findOne({ name: normalizedPlanName });
    
    if (!planDetails) {
      planDetails = await Plan.create({
        name: normalizedPlanName,
        price: 0,
        renderLimit: normalizedPlanName === 'free' ? 0 : 50, 
        model3DLimit: normalizedPlanName === 'free' ? 0 : 10,
      });
    }

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ==========================================
    // 3. Upsert للـ Subscription
    // ==========================================
    let subscription = await Subscription.findOne({ userId: userId });

    if (!subscription) {
      // مش موجود؟ اعمل Create
      subscription = await Subscription.create({
        userId: userId,
        planId: planDetails._id,
        status: "active",
        billingCycle: "monthly",
        startDate: now,
        endDate: nextMonth
      });
    } else {
      // موجود؟ اعمل Update
      subscription.planId = planDetails._id;
      subscription.status = "active";
      subscription.startDate = now;
      subscription.endDate = nextMonth;
      await subscription.save();
    }

    // ==========================================
    // 4. Upsert للـ Usage
    // ==========================================
    let usage = await Usage.findOne({ userId: userId });

    if (!usage) {
      // مش موجود؟ اعمل Create
      usage = await Usage.create({
        userId: userId,
        subscriptionId: subscription._id,
        remainingRenders: planDetails.renderLimit,
        consumedRenders: 0,
        periodStart: subscription.startDate,
        periodEnd: subscription.endDate
      });
    } else {
      // موجود؟ اعمل Update
      usage.subscriptionId = subscription._id;
      usage.remainingRenders = planDetails.renderLimit;
      usage.periodStart = subscription.startDate;
      usage.periodEnd = subscription.endDate;
      await usage.save();
    }

    // ==========================================
    // 5. Update لبيانات المستخدم
    // ==========================================
    user.plan = planDetails.name;
    await user.save();

    // تسجيل العملية (لو دالة الـ log موجودة)
    if (typeof logAdminAction === 'function') {
      await logAdminAction(req.admin._id, "CHANGE_PLAN", userId, `Upserted records for plan ${planDetails.name}`);
    }

    return res.status(200).json({
      success: true,
      message: `Upsert successful. User is now on ${planDetails.name} plan.`,
      data: { subscription, usage }
    });

  } catch (error) {
    console.error("Error in changeUserPlan:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};