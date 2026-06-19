import Subscription from '../../models/billing system/Subscription.js'; 
import Plan from '../../models/billing system/plan.js'; 
import Payment from '../../models/billing system/payments.js'; 
import Usage from '../../models/billing system/usage.js'; 
import User from '../../models/user.js'; 

// الرابط الأساسي لفواتيرك (استخدم staging في التطوير، و app.fawaterk.com في الإنتاج)
const FAWATERK_BASE_URL = 'https://staging.fawaterk.com/api/v2';

export const getMySubscription = async (req, res) => { 
    try { 
        const userId = req.user._id; 

        const subscription = await Subscription.findOne({ 
            userId, 
            status: { $in: ['active', 'trial'] } 
        }).populate('planId'); 

        if (!subscription) { 
            return res.status(200).json({ 
                success: true, 
                message: "No active subscription found", 
                data: null 
            }); 
        } 

        const usage = await Usage.findOne({ 
            subscriptionId: subscription._id, 
            periodEnd: { $gte: new Date() } 
        }); 

        res.status(200).json({ 
            success: true, 
            data: { 
                subscription, 
                usage 
            } 
        }); 
    } catch (error) { 
        console.error("Error in getMySubscription:", error); 
        res.status(500).json({ success: false, message: "Server error" }); 
    } 
}; 

export const subscribePlan = async (req, res) => { 
  try { 
    const { planId, billingCycle } = req.body; 
    const user = req.user; 

    const plan = await Plan.findById(planId); 
    if (!plan) { 
      return res.status(404).json({ success: false, message: "Plan not found" }); 
    } 

    const existingSub = await Subscription.findOne({ 
      userId: user._id, 
      status: 'active' 
    }); 
    
    if (existingSub) { 
      return res.status(400).json({ 
        success: false, 
        message: "You already have an active subscription. Please change/upgrade your plan instead." 
      }); 
    } 

    if (plan.price === 0) { 
      const startDate = new Date(); 
      const endDate = new Date(); 
      if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1); 
      else endDate.setMonth(endDate.getMonth() + 1); 

      const newSubscription = await Subscription.create({ 
        userId: user._id, 
        planId, 
        status: 'active', 
        billingCycle, 
        startDate, 
        endDate, 
        renewalDate: endDate 
      }); 

      await Usage.create({ 
        userId: user._id, 
        subscriptionId: newSubscription._id, 
        remainingRenders: plan.renderLimit, 
        periodStart: startDate, 
        periodEnd: endDate 
      }); 

      await User.findByIdAndUpdate(user._id, { plan: plan.name }); 

      return res.status(201).json({ 
        success: true, 
        message: "Successfully subscribed to free plan", 
        data: newSubscription 
      }); 
    } 

    // معالجة الباقات المدفوعة عبر فواتيرك v2
    try {
      const invoiceResponse = await fetch(`${FAWATERK_BASE_URL}/invoiceInitPay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FAWATERK_API_KEY}`
        },
        body: JSON.stringify({
          cartTotal: plan.price.toString(),
          currency: "EGP",
          customer: {
            first_name: user.firstName || "IntelliRoom",
            last_name: user.lastName || "User",
            email: user.email,
            phone: user.phone || "01000000000"
          },
          cartItems: [
            {
              name: `Plan: ${plan.name}`,
              price: plan.price.toString(),
              quantity: "1"
            }
          ]
        })
      });

      const invoiceData = await invoiceResponse.json();

      if (invoiceData.status === 'success') {
        const invoiceId = invoiceData.data.invoice_id;
        const paymentLink = invoiceData.data.payment_data.redirectTo;

        // إنشاء سجل دفع معلق لحين وصول تأكيد الـ Webhook
        await Payment.create({
            userId: user._id,
            planId: planId, // نحتفظ بالخطة لمعرفتها وقت التفعيل
            provider: 'fawaterak',
            fawaterkOrderId: invoiceId,
            status: 'pending',
            amount: plan.price,
            currency: 'EGP'
        });

        res.status(200).json({ 
          success: true, 
          message: "Payment required. Redirect to checkout.",
          checkoutUrl: paymentLink,
          invoiceId: invoiceId
        });
      } else {
        console.error("Fawaterak init error:", invoiceData);
        res.status(400).json({ success: false, message: "Error initializing payment with provider" });
      }

    } catch (error) {
      console.error("Error creating Fawaterak checkout:", error);
      res.status(500).json({ success: false, message: "Error initializing payment" });
    }

  } catch (error) { 
    console.error("Error in subscribePlan:", error); 
    res.status(500).json({ success: false, message: "Server error" }); 
  } 
}; 

export const createFawaterkCheckout = async (req, res) => { 
  try { 
    const { planId } = req.body; 
    const user = req.user; 

    const plan = await Plan.findById(planId); 
    if (!plan) { 
      return res.status(404).json({ success: false, message: "Plan not found" }); 
    } 

    // استخدام نفس منطق الدفع للإصدار الثاني
    const invoiceResponse = await fetch(`${FAWATERK_BASE_URL}/invoiceInitPay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FAWATERK_API_KEY}`
      },
      body: JSON.stringify({
        cartTotal: plan.price.toString(),
        currency: "EGP",
        customer: {
          first_name: user.firstName || "IntelliRoom",
          last_name: user.lastName || "User",
          email: user.email,
          phone: user.phone || "01000000000"
        },
        cartItems: [
          {
            name: `Subscription: ${plan.name}`,
            price: plan.price.toString(),
            quantity: "1"
          }
        ]
      })
    });

    const invoiceData = await invoiceResponse.json();

    if (invoiceData.status === 'success') {
      const invoiceId = invoiceData.data.invoice_id;
      
      // حفظ العملية كقيد الانتظار
      await Payment.create({
          userId: user._id,
          planId: planId,
          provider: 'fawaterak',
          fawaterkOrderId: invoiceId,
          status: 'pending',
          amount: plan.price,
          currency: 'EGP'
      });

      res.status(200).json({ 
        success: true, 
        message: "Checkout URL generated successfully",
        checkoutUrl: invoiceData.data.payment_data.redirectTo,
        invoiceId: invoiceId
      });
    } else {
      res.status(400).json({ success: false, message: "Failed to generate checkout URL" });
    }

  } catch (error) { 
    console.error("Error in createFawaterkCheckout:", error); 
    res.status(500).json({ success: false, message: "Server error during payment initialization" }); 
  } 
}; 

export const unsubscribePlan = async (req, res) => { 
  try { 
    const userId = req.user._id; 

    const subscription = await Subscription.findOne({ userId, status: 'active' }); 

    if (!subscription) { 
      return res.status(404).json({ 
        success: false, 
        message: "No active subscription found to cancel" 
      }); 
    } 

    if (subscription.cancelAtPeriodEnd) { 
      return res.status(400).json({ 
        success: false, 
        message: "Subscription is already set to cancel at the end of the billing period" 
      }); 
    } 

    subscription.cancelAtPeriodEnd = true; 
    subscription.fawaterkCardToken = undefined; 
    
    await subscription.save(); 

    res.status(200).json({ 
      success: true, 
      message: "Subscription auto-renewal has been disabled. You can use your plan until the end of the current cycle." 
    }); 

  } catch (error) { 
    console.error("Error in unsubscribePlan:", error); 
    res.status(500).json({ success: false, message: "Server error" }); 
  } 
}; 

export const changePlan = async (req, res) => { 
  try { 
    const { newPlanId } = req.body; 
    const user = req.user; 
    
    const newPlan = await Plan.findById(newPlanId); 
    if (!newPlan) { 
      return res.status(404).json({ success: false, message: "New plan not found" }); 
    } 

    const currentSubscription = await Subscription.findOne({ 
      userId: user._id, 
      status: 'active' 
    }).populate('planId'); 
    
    if (!currentSubscription) { 
      return res.status(404).json({ success: false, message: "No active subscription found" }); 
    } 

    if (currentSubscription.planId._id.toString() === newPlanId) { 
      return res.status(400).json({ success: false, message: "Already on this plan" }); 
    } 
   
    const priceDifference = newPlan.price - currentSubscription.planId.price; 

    if (priceDifference <= 0) { 
      currentSubscription.planId = newPlanId; 
      await currentSubscription.save(); 

      const currentUsage = await Usage.findOne({ 
        subscriptionId: currentSubscription._id, 
        periodEnd: { $gte: new Date() } 
      }); 

      if (currentUsage) { 
        currentUsage.remainingRenders = Math.max( 
          0, 
          currentUsage.remainingRenders + priceDifference 
        ); 
        await currentUsage.save(); 
      } 

      await User.findByIdAndUpdate(user._id, { plan: newPlan.name }); 

      return res.status(200).json({ 
        success: true, 
        message: `Successfully downgraded to ${newPlan.name}`, 
        data: currentSubscription 
      }); 
    } 

    // Upgrade - دفع الفارق عبر فواتيرك v2
    try {
      const invoiceResponse = await fetch(`${FAWATERK_BASE_URL}/invoiceInitPay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FAWATERK_API_KEY}`
        },
        body: JSON.stringify({
          cartTotal: priceDifference.toString(),
          currency: "EGP",
          customer: {
            first_name: user.firstName || "IntelliRoom",
            last_name: user.lastName || "User",
            email: user.email,
            phone: user.phone || "01000000000"
          },
          cartItems: [
            {
              name: `Upgrade to ${newPlan.name}`,
              price: priceDifference.toString(),
              quantity: "1"
            }
          ]
        })
      });

      const invoiceData = await invoiceResponse.json();

      if (invoiceData.status === 'success') {
        const invoiceId = invoiceData.data.invoice_id;

        await Payment.create({
            userId: user._id,
            planId: newPlanId, // الخطة الجديدة
            provider: 'fawaterak',
            fawaterkOrderId: invoiceId,
            status: 'pending',
            amount: priceDifference,
            currency: 'EGP'
        });

        res.status(200).json({ 
          success: true, 
          message: "Payment required for upgrade",
          checkoutUrl: invoiceData.data.payment_data.redirectTo,
          invoiceId: invoiceId
        });
      } else {
        res.status(400).json({ success: false, message: "Error generating upgrade invoice" });
      }

    } catch (error) { 
      console.error("Error creating upgrade payment:", error); 
      res.status(500).json({ success: false, message: "Error initiating payment" }); 
    } 

  } catch (error) { 
    console.error("Error in changePlan:", error); 
    res.status(500).json({ success: false, message: "Server error" }); 
  } 
}; 

export const fawaterkWebhook = async (req, res) => {
  try {
    const invoiceId = req.body.invoice_id;

    if (!invoiceId) {
      return res.status(400).json({ success: false, message: "Missing invoice_id" });
    }

    // التحقق الآمن: سؤال سيرفرات فواتيرك عن حالة الفاتورة
    const verifyResponse = await fetch(`${FAWATERK_BASE_URL}/getInvoiceData/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FAWATERK_API_KEY}`
      }
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.status !== 'success') {
      return res.status(404).json({ success: false, message: "Invoice not found on Fawaterk" });
    }

    const invoiceStatus = verifyData.data.is_paid;
    
    const pendingPayment = await Payment.findOne({ fawaterkOrderId: invoiceId, status: 'pending' });

    if (!pendingPayment) {
        // نرد بـ 200 عشان فواتيرك متعملش إعادة إرسال إذا كانت العملية مش تبعنا
        return res.status(200).json({ success: true, message: "Payment record not found or already processed" });
    }

    if (invoiceStatus === true) {
      const userId = pendingPayment.userId;
      const planId = pendingPayment.planId;

      const subscription = await Subscription.findOneAndUpdate(
        { userId, status: { $ne: 'canceled' } },
        {
          planId,
          status: 'active',
        },
        { new: true, upsert: true }
      );

      pendingPayment.status = 'paid';
      pendingPayment.subscriptionId = subscription._id;
      pendingPayment.paidAt = new Date();
      await pendingPayment.save();

      const plan = await Plan.findById(planId);
      await User.findByIdAndUpdate(userId, { plan: plan.name });

    } else {
      pendingPayment.status = 'failed';
      await pendingPayment.save();
    }

    res.status(200).json({ success: true, message: "Webhook processed securely" });

  } catch (error) {
    console.error("Error processing Fawaterak Webhook:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



export const createPaymobCheckout = async (req, res) => {
}
export const paymobWebhook = async (req, res) => {
}
 