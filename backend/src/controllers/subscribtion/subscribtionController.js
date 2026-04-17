import Subscription from '../../models/Subscription.js';
import Plan from '../../models/plan.js';
import Usage from '../../models/usage.js';
import User from '../../models/user.js';
import crypto from 'crypto';
import Payment from '../../models/payments.js';

// 1. جلب تفاصيل اشتراك المستخدم الحالي
export const getMySubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        // بنجيب الاشتراك الفعال ونعمل populate لمعلومات الخطة
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

        // نجيب الاستهلاك الحالي في نفس الفترة
        const usage = await Usage.findOne({ 
            subscriptionId: subscription._id,
            periodEnd: { $gte: new Date() } // الاستهلاك اللي لسه ماخلصش وقته
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

// 2. الاشتراك في خطة جديدة
export const subscribePlan = async (req, res) => {
    try {
        const { planId, billingCycle } = req.body;
        const userId = req.user._id;

        // التأكد إن الخطة موجودة
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        // التأكد إن اليوزر معندوش اشتراك فعال بالفعل
        const existingSub = await Subscription.findOne({ userId, status: 'active' });
        if (existingSub) {
            return res.status(400).json({ success: false, message: "You already have an active subscription. Please change/upgrade your plan instead." });
        }

        /**
         * [INTEGRATION POINT]
         * هنا المفروض بتكلم Stripe/PayPal عشان تـ Create Checkout Session
         * وترجع الـ URL لليوزر يدفع هناك. الـ Code اللي تحت ده هيتنفذ 
         * فعلياً في الـ Webhook بعد نجاح الدفع. بس هنكتبه هنا للتوضيح.
         */

        // حساب تواريخ البداية والنهاية
        const startDate = new Date();
        const endDate = new Date();
        if (billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        const newSubscription = await Subscription.create({
            userId,
            planId,
            status: 'active',
            billingCycle,
            startDate,
            endDate,
            renewalDate: endDate
        });

        // إنشاء سجل الاستهلاك (Usage)
        await Usage.create({
            userId,
            subscriptionId: newSubscription._id,
            remainingRenders: plan.renderLimit,
            periodStart: startDate,
            periodEnd: endDate
        });

        // تحديث اليوزر
        await User.findByIdAndUpdate(userId, { plan: plan.name });

        res.status(201).json({ 
            success: true, 
            message: "Successfully subscribed to plan", 
            data: newSubscription 
        });

    } catch (error) {
        console.error("Error in subscribePlan:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 3. إلغاء الاشتراك (إيقاف التجديد التلقائي)
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

        /**
         * [INTEGRATION POINT]
         * هنا بتكلم API بوابة الدفع عشان توقف الـ Auto-Renewal
         * stripe.subscriptions.update(subId, { cancel_at_period_end: true })
         */

        // احنا مش بنمسح الاشتراك، احنا بنخليه يخلص مدته وميتجددش
        subscription.cancelAtPeriodEnd = true;
        await subscription.save();

        res.status(200).json({ 
            success: true, 
            message: "Subscription will be canceled at the end of the current billing cycle." 
        });

    } catch (error) {
        console.error("Error in unsubscribePlan:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 4. ترقية أو تخفيض الخطة (Upgrade / Downgrade)
export const changePlan = async (req, res) => {
    try {
        const { newPlanId } = req.body;
        const userId = req.user._id;

        const newPlan = await Plan.findById(newPlanId);
        if (!newPlan) {
            return res.status(404).json({ success: false, message: "New plan not found" });
        }

        const currentSubscription = await Subscription.findOne({ userId, status: 'active' }).populate('planId');
        
        if (!currentSubscription) {
            return res.status(404).json({ success: false, message: "No active subscription found to change" });
        }

        if (currentSubscription.planId._id.toString() === newPlanId) {
            return res.status(400).json({ success: false, message: "You are already on this plan" });
        }

        /**
         * [INTEGRATION POINT]
         * هنا بتكلم بوابة الدفع تعمل Proration (حساب الفرق في الفلوس)
         * وتعمل Update للـ Subscription هناك الأول.
         */

        // تحديث الخطة في الداتا بيز
        currentSubscription.planId = newPlanId;
        await currentSubscription.save();

        // تحديث الـ Limits في جدول الـ Usage
        const currentUsage = await Usage.findOne({ 
            subscriptionId: currentSubscription._id,
            periodEnd: { $gte: new Date() }
        });

        if (currentUsage) {
            // إضافة الفرق في الـ Limits (ممكن تحتاج Logic أعقد حسب الـ Business Rules بتاعتك)
            const difference = newPlan.renderLimit - currentSubscription.planId.renderLimit;
            currentUsage.remainingRenders = Math.max(0, currentUsage.remainingRenders + difference);
            await currentUsage.save();
        }

        // تحديث اليوزر
        await User.findByIdAndUpdate(userId, { plan: newPlan.name });

        res.status(200).json({ 
            success: true, 
            message: `Successfully changed plan to ${newPlan.name}`,
            data: currentSubscription
        });

    } catch (error) {
        console.error("Error in changePlan:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// subscriptionController.js

export const createPaymobCheckout = async (req, res) => {
    try {
        const { planId } = req.body;
        const user = req.user; // مفترض إن الـ protect middleware بيجيب بيانات اليوزر

        // 1. التأكد إن الخطة موجودة
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }

        // السعر في بيموب لازم يكون بالقرش (Cents)
        const amountInCents = plan.price * 100; 

        // ==========================================
        // الخطوة 1: Authentication
        // ==========================================
        const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY })
        });
        const authData = await authResponse.json();
        const authToken = authData.token;

        // ==========================================
        // الخطوة 2: Order Registration
        // ==========================================
        const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authToken,
                delivery_needed: "false",
                amount_cents: amountInCents,
                currency: "EGP",
                // بنبعت الـ IDs بتاعتنا عشان بيموب يرجعهالنا في الـ Webhook ونعرف مين دفع لإيه
                merchant_order_id: `PLAN_${plan._id}_USER_${user._id}_${Date.now()}` 
            })
        });
        const orderData = await orderResponse.json();
        const orderId = orderData.id;

        // ==========================================
        // الخطوة 3: Payment Key Request
        // ==========================================
        // بيموب بيطلب بيانات العميل بشكل إجباري، لو مش عندك في الداتا بيز ابعت قيم افتراضية مؤقتاً
        const billingData = {
            apartment: "NA", 
            email: user.email, 
            floor: "NA", 
            first_name: user.firstName || "User", 
            street: "NA", 
            building: "NA", 
            phone_number: "+201000000000", // لو معندكش رقم تليفون لليوزر حط رقم افتراضي
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

        // ==========================================
        // الخطوة 4: إنشاء رابط الدفع
        // ==========================================
        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

        res.status(200).json({ 
            success: true, 
            message: "Checkout URL generated successfully",
            checkoutUrl // هتاخد الرابط ده في الـ Frontend وتعمله Redirect أو تفتحه في iframe
        });

    } catch (error) {
        console.error("Error in createPaymobCheckout:", error);
        res.status(500).json({ success: false, message: "Server error during payment initialization" });
    }
};


export const paymobWebhook = async (req, res) => {
    try {
        // بيموب بتبعت الـ HMAC في الـ Query
        const hmac = req.query.hmac;
        const data = req.body.obj;

        // 1. تجميع الحقول المطلوبة بالترتيب الأبجدي (قاعدة بيموب الصارمة للـ HMAC)
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

        // 2. تشفير الـ String بالـ HMAC السري بتاعك
        const hashed = crypto
            .createHmac('sha512', process.env.PAYMOB_HMAC)
            .update(concatenatedString)
            .digest('hex');

        // 3. مقارنة التشفير
        if (hashed !== hmac) {
            console.error("HMAC validation failed! Possible malicious request.");
            return res.status(401).send("Unauthorized"); // لازم نرجع Status Code عشان بيموب ماتحاولش تبعت تاني
        }

        // ==========================================
        // 4. معالجة حالة الدفع (Business Logic)
        // ==========================================
        
        // استخراج الـ Data اللي كنا باعتينها في الـ Order (زي الـ planId والـ userId)
        const merchantOrderId = data.order.merchant_order_id; 
        // افترضنا إن شكلها كان: PLAN_123_USER_456_TIMESTAMP
        const orderParts = merchantOrderId.split('_');
        const planId = orderParts[1];
        const userId = orderParts[3];

        if (data.success === true) {
            // -- الدفع نجح --
            
            // تحديث أو إنشاء الاشتراك
            const subscription = await Subscription.findOneAndUpdate(
                { userId, status: 'active' }, 
                { 
                    planId,
                    status: 'active',
                    paymobCardToken: data.token, // حفظ التوكن لو هنعمل تجديد تلقائي بعدين
                    // هنا المفروض نحسب تواريخ الـ startDate و endDate زي ما عملنا فوق
                },
                { new: true, upsert: true }
            );

            // تسجيل عملية الدفع
            await Payment.create({
                userId,
                subscriptionId: subscription._id,
                provider: 'paymob',
                providerTransactionId: data.id,
                paymobOrderId: data.order.id,
                status: 'paid',
                amount: data.amount_cents / 100, // نرجعها للجنيه
                currency: 'EGP',
                paidAt: new Date()
            });

            // تحديث خطة اليوزر
            const plan = await Plan.findById(planId);
            await User.findByIdAndUpdate(userId, { plan: plan.name });

        } else {
            // -- الدفع فشل --
            await Payment.create({
                userId,
                // لو مفيش اشتراك أصلاً ممكن تخلي الـ subscriptionId مش required في حالة الفشل
                provider: 'paymob',
                providerTransactionId: data.id,
                paymobOrderId: data.order.id,
                status: 'failed',
                amount: data.amount_cents / 100,
                currency: 'EGP'
            });
        }

        // بيموب بتحتاج دايماً يرد عليها بـ 200 عشان تعرف إنك استلمت الريكويست
        res.status(200).send("Webhook received"); 

    } catch (error) {
        console.error("Error processing Paymob Webhook:", error);
        res.status(500).send("Server error");
    }
};