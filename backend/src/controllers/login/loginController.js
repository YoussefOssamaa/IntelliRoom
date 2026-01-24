import User from '../../models/user.js';
import { emailSchema, newUserSchema, resetPasswordSchema, userSchema } from '../../validations/login.validator.js';
import bcrypt from "bcryptjs";
import { normalizeResponseTime } from '../../utils/normalizeResponseTime.util.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import Refresh from '../../models/refreshToken.js';
import { sendEmail } from '../../utils/sendEmail.util.js';
import ForgetPassword from '../../models/forgetPassword.js';

const authPrivateKey = fs.readFileSync(path.join("src", "keys", "AuthPrivate.pem"), 'utf8');
const authPublicKey = fs.readFileSync(path.join("src", "keys", "AuthPublic.pem"), 'utf8');
const refreshPrivateKey = fs.readFileSync(path.join("src", "keys", "RefreshPrivate.pem"), 'utf8');
const refreshPublicKey = fs.readFileSync(path.join("src", "keys", "RefreshPublic.pem"), 'utf8');
const resetPrivateKey = fs.readFileSync(path.join("src", "keys", "ResetPrivate.pem"), 'utf8');
const resetPublicKey = fs.readFileSync(path.join("src", "keys", "ResetPublic.pem"), 'utf8');

// console.log(authPrivateKey);
// console.log(authPublicKey);
export const registerHandler = async (req, res) => {
    const genericError = "Invalid credentials or user already exists"
    try {
        await normalizeResponseTime()
        const validation = newUserSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, message: genericError })
        }
        const { email, firstName, lastName, user_name, password } = validation.data;
        const user = await User.findOne({ $or: [{ email }, { user_name }] });
        if (user) {
            return res.status(400).json({ success: false, message: genericError })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        await User.create({
            email,
            firstName,
            lastName,
            user_name,
            password: hashedPassword
        })
        return res.status(201).json({ success: true, message: "User registered successfully." })

    } catch (e) {
        console.log(e.message);
        return res.status(400).json({ success: false, message: genericError })
    }
}

export const loginHandler = async (req, res) => {

    try {
        const { data, success } = userSchema.safeParse(req.body);
        const genericMessage = "invalid username or password"
        if (!success) {
            return res.status(401).json({ success: false, message: genericError });
        }
        const { email, password } = data;

        const logging_user = await User.findOne({ email });

        await normalizeResponseTime()

        if (!logging_user) {
            return res.status(401).json({ success: false, message: genericMessage });
        }

        const check = await bcrypt.compare(password, logging_user.password);

        if (!check) {
            return res.status(401).json({ success: false, message: genericMessage });
        }

        const payload = {
            userId: logging_user._id,
        }

        const commonCookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        }

        const refreshCookieOptions = {
            ...commonCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 //in melliseconds
        }

        const authCookieOptions = {
            ...commonCookieOptions,
            maxAge: 15 * 60 * 1000 //in melliseconds
        }

        const authToken = jwt.sign(payload, authPrivateKey, {
            expiresIn: 15 * 60,
            algorithm: "RS256",

        });

        const refreshToken = jwt.sign(payload, refreshPrivateKey, {
            expiresIn: 7 * 24 * 60 * 60,
            algorithm: "RS256",
        });

        await Refresh.create({
            user_id: logging_user._id,
            refreshToken,
            expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200)
            .cookie("Authentication", authToken, authCookieOptions)
            .cookie("Refresh", refreshToken, refreshCookieOptions)
            .json({ success: true, message: "logged in successfully" })


    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });

    }

}

export const refreshTokenHandler = async (req, res) => {
    const genericError = "not authenticated"

    try {
        await normalizeResponseTime();

        const validation = refreshCookieSchema.safeParse(req.cookies?.Refresh);
        if (!validation.success) {
            return res.status(401).json({ success: false, message: genericError })
        }
        const token = validation?.data?.Refresh;
        const user = await Refresh.findOne({ refreshToken: token });
        if (!user) {
            return res.status(401).json({ success: false, message: genericError })
        }

        const payload = jwt.verify(token, refreshPublicKey, {
            algorithms: ["RS256"],
        });

        const authCookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 15 * 60 * 1000
        }
        const authPayload = {
            userId: user.user_id
        }

        const authToken = jwt.sign(authPayload, authPrivateKey, {
            expiresIn: 15 * 60,
            algorithm: "RS256",
        })


        return res.status(200)
            .cookie("Authentication", authToken, authCookieOptions)
            .json({ success: true, message: "token refreshed successfully" });


    } catch (e) {

        return res.status(401)
            .clearCookie("Authentication")
            .clearCookie("Refresh")
            .json({ success: false, message: genericError });
    }
}

export const forgetPasswordHandler = async (req, res) => {
    const genericError = "If an account exists with this email, a password reset link has been sent."

    try {
        const validation = emailSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(401).json({ success: false, message: genericError });
        }
        const email = validation.data.email;
        const user = await User.findOne({ email });

        await normalizeResponseTime();

        if (!user) {
            return res.status(401).json({ success: false, message: genericError });
        }
        const randomString = crypto
            .randomBytes(parseInt(Math.random() * crypto.randomInt(100, 10000)))
            .toString('hex');

        const token = jwt.sign({ str: randomString }, resetPrivateKey, {
            algorithm: 'RS256',
            expiresIn: '15m'
        })

        await ForgetPassword.create({
            user_id: user._id,
            ForgetPasswordToken: token,
            expireTime: Date.now() + 15 * 60 * 1000
        });

        sendEmail(token)

        return res.json({ success: true, message: genericError })

    } catch (e) {
        console.log(e.messsage);
        return res.json({ success: false, message: genericError })

    }
}

export const resetPasswordHandler = async (req, res) => {
    const genericError = "password reset failed"
    try {
        const validation = resetPasswordSchema.safeParse(req.body);
        const newPassword = validation.data.newPassword
        const token = validation.data.token

        const forgetPasswordUser = await ForgetPassword.findOne({ ForgetPasswordToken: token });
        if (!forgetPasswordUser) {
            return res.status(401).json({ success: false, message: genericError });
        }
        const user = await User.findOne({ _id: forgetPasswordUser.user_id });

        await normalizeResponseTime();

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res
            .status(200)
            .clearCookie("Authentication")
            .clearCookie("Refresh")
            .json({ success: true, message: "password is reset successfully" })

    } catch (e) {
        console.log(e.message)
        return res.status(401).json({ success: false, message: genericError });

    }
}

export const logoutController = async (req, res) => {
    try {
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        };
        const validation = authCookieSchema.safeParse(req.cookies?.Refresh);
        if (!validation.success) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }
        const token = validation.data.Refresh;

        await Refresh.deleteOne({ refreshToken: token });

        return res.status(200)
            .clearCookie("Authentication", cookieOptions)
            .clearCookie("Refresh", cookieOptions)
            .json({ success: true, message: "logged out successfully" });

    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};