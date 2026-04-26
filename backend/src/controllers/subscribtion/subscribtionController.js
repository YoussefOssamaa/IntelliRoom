import Subscription from '../../models/billing system/Subscription.js';
import Plan from '../../models/billing system/plan.js';
import Payment from '../../models/billing system/payments.js';
import Usage from '../../models/billing system/usage.js';
import User from '../../models/user.js';
import crypto from 'crypto';

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

        const existingSub = await Subscription.findOne({ userId: user._id, status: 'active' });
        if (existingSub) {
            return res.status(400).json({ success: false, message: "You already have an active subscription. Please change/upgrade your plan instead." });
        }

        // 1. لو الخطة مجانية (Free Plan)
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

        // 2. لو الخطة مدفوعة (Paid Plan - بيموب)
        const amountInCents = plan.price * 100; 

        // - الحصول على التوكن
        const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
        });
        const authData = await authResponse.json();

        // - إنشاء الأوردر
        const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authData.token,
                delivery_needed: "false",
                amount_cents: amountInCents,
                currency: "EGP",
                merchant_order_id: `PLAN_${plan._id}_USER_${user._id}_${Date.now()}` 
            })
        });
        const orderData = await orderResponse.json();

        // - مفتاح الدفع
        const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authData.token,
                amount_cents: amountInCents,
                expiration: 3600,
                order_id: orderData.id,
                billing_data: {
                    apartment: "NA", email: user.email, floor: "NA", 
                    first_name: user.firstName || "User", street: "NA", 
                    building: "NA", phone_number: "+201000000000", 
                    shipping_method: "NA", postal_code: "NA", city: "Cairo", 
                    country: "EG", last_name: user.lastName || "Name", state: "NA"
                },
                currency: "EGP",
                integration_id: process.env.PAYMOB_INTEGRATION_ID
            })
        });
        const paymentKeyData = await paymentKeyResponse.json();

        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyData.token}`;

        // هنا بنرجع الرابط لليوزر ومش بنعمل Subscription في الداتا بيز، الـ Webhook هو اللي هيعمله لما الدفع ينجح
        return res.status(200).json({ 
            success: true, 
            message: "Payment required. Redirect to checkout.",
            checkoutUrl 
        });

    } catch (error) {
        console.error("Error in subscribePlan:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const unsubscribePlan = async (req, res) => {
    try {
        const userId = req.user._id;

        const subscription = await Subscription.findOne({ userId, status: 'active' });

        if (!subscription) {
            return res.status(404).json({ success: false, message: "No active subscription found to cancel" });
        }

        if (subscription.cancelAtPeriodEnd) {
            return res.status(400).json({ success: false, message: "Subscription is already set to cancel at the end of the billing period" });
        }

        // [PAYMOB INTEGRATION]
        // مفيش API بنكلمه في بيموب للإلغاء، إحنا بس بنمسح التوكن بتاع الكارت عشان منقدرش نخصم منه تاني
        subscription.cancelAtPeriodEnd = true;
        subscription.paymobCardToken = undefined; // مسح الكارت
        
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

        const currentSubscription = await Subscription.findOne({ userId: user._id, status: 'active' }).populate('planId');
        
        if (!currentSubscription) {
            return res.status(404).json({ success: false, message: "No active subscription found to change" });
        }

        if (currentSubscription.planId._id.toString() === newPlanId) {
            return res.status(400).json({ success: false, message: "You are already on this plan" });
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
                currentUsage.remainingRenders = Math.max(0, currentUsage.remainingRenders + priceDifference);
                await currentUsage.save();
            }

            await User.findByIdAndUpdate(user._id, { plan: newPlan.name });

            return res.status(200).json({ 
                success: true, 
                message: `Successfully downgraded plan to ${newPlan.name}`,
                data: currentSubscription
            });
        }

        const amountInCents = priceDifference * 100; 

        const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
        });

        const authData = await authResponse.json();

        const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authData.token,
                delivery_needed: "false",
                amount_cents: amountInCents,
                currency: "EGP",
                merchant_order_id: `PLAN_${newPlan._id}_USER_${user._id}_${Date.now()}` 
            })
        });

        const orderData = await orderResponse.json();

        const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authData.token,
                amount_cents: amountInCents,
                expiration: 3600,
                order_id: orderData.id,
                billing_data: {
                    apartment: "NA", email: user.email, floor: "NA", 
                    first_name: user.firstName || "User", street: "NA", 
                    building: "NA", phone_number: "+201000000000", 
                    shipping_method: "NA", postal_code: "NA", city: "Cairo", 
                    country: "EG", last_name: user.lastName || "Name", state: "NA"
                },
                currency: "EGP",
                integration_id: process.env.PAYMOB_INTEGRATION_ID
            })
        });
        
        const paymentKeyData = await paymentKeyResponse.json();

        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKeyData.token}`;

        return res.status(200).json({ 
            success: true, 
            message: "Payment required for upgrade. Redirect to checkout.",
            checkoutUrl
        });

    } catch (error) {
        console.error("Error in changePlan:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const createPaymobCheckout = async (req, res) => {
    try {
        const { planId } = req.body;
        const user = req.user; // مفترض إن الـ protect middleware بيجيب بيانات اليوزر

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        const amountInCents = plan.price * 100; 
        const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
        });
        const authData = await authResponse.json();
        const authToken = authData.token;

        const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authToken,
                delivery_needed: "false",
                amount_cents: amountInCents,
                currency: "EGP",
                merchant_order_id: `PLAN_${plan._id}_USER_${user._id}_${Date.now()}` 
            })
        });
        const orderData = await orderResponse.json();
        const orderId = orderData.id;

        const billingData = {
            apartment: "NA", 
            email: user.email, 
            floor: "NA", 
            first_name: user.firstName || "User", 
            street: "NA", 
            building: "NA", 
            phone_number: "+201000000000", 
            shipping_method: "NA", 
            postal_code: "NA", 
            city: "Cairo", 
            country: "EG", 
            last_name: user.lastName || "Name", 
            state: "NA"
        };

        const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authToken,
                amount_cents: amountInCents,
                expiration: 3600, // الرابط هينتهي بعد ساعة
                order_id: orderId,
                billing_data: billingData,
                currency: "EGP",
                integration_id: process.env.PAYMOB_INTEGRATION_ID
            })
        });
        const paymentKeyData = await paymentKeyResponse.json();
        const paymentToken = paymentKeyData.token;

        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

        res.status(200).json({ 
            success: true, 
            message: "Checkout URL generated successfully",
            checkoutUrl
        });

    } catch (error) {
        console.error("Error in createPaymobCheckout:", error);
        res.status(500).json({ success: false, message: "Server error during payment initialization" });
    }
};


export const paymobWebhook = async (req, res) => {
    try {
        const hmac = req.query.hmac;
        const data = req.body.obj;

        const concatenatedString = [
            data.amount_cents,
            data.created_at,
            data.currency,
            data.error_occured,
            data.has_parent_transaction,
            data.id,
            data.integration_id,
            data.is_3d_secure,
            data.is_auth,
            data.is_capture,
            data.is_refunded,
            data.is_standalone_payment,
            data.is_voided,
            data.order.id,
            data.owner,
            data.pending,
            data.source_data.pan,
            data.source_data.sub_type,
            data.source_data.type,
            data.success,
        ].join('');

        const hashed = crypto
            .createHmac('sha512', process.env.PAYMOB_HMAC)
            .update(concatenatedString)
            .digest('hex');

        if (hashed !== hmac) {
            console.error("HMAC validation failed! Possible malicious request.");
            return res.status(401).send("Unauthorized"); // لازم نرجع Status Code عشان بيموب ماتحاولش تبعت تاني
        }

        
        const merchantOrderId = data.order.merchant_order_id; 
        const orderParts = merchantOrderId.split('_');
        const planId = orderParts[1];
        const userId = orderParts[3];

        if (data.success === true) {
            const subscription = await Subscription.findOneAndUpdate(
                { userId, status: 'active' }, 
                { 
                    planId,
                    status: 'active',
                    paymobCardToken: data.token,
                },
                { new: true, upsert: true }
            );


            await Payment.create({
                userId,
                subscriptionId: subscription._id,
                provider: 'paymob',
                providerTransactionId: data.id,
                paymobOrderId: data.order.id,
                status: 'paid',
                amount: data.amount_cents / 100, 
                currency: 'EGP',
                paidAt: new Date()
            });

            const plan = await Plan.findById(planId);
            await User.findByIdAndUpdate(userId, { plan: plan.name });

        } else {
            
            await Payment.create({
                userId,
                provider: 'paymob',
                providerTransactionId: data.id,
                paymobOrderId: data.order.id,
                status: 'failed',
                amount: data.amount_cents / 100,
                currency: 'EGP'
            });
        }

        res.status(200).send("Webhook received"); 

    } catch (error) {
        console.error("Error processing Paymob Webhook:", error);
        res.status(500).send("Server error");
    }
};