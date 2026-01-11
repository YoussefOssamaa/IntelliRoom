import User from '../../models/user.js';
import { userSchema } from '../../validations/login.validator.js';
import bcrypt from "bcryptjs";
import { normalizeResponseTime } from '../../utils/normalizeResponseTime.util.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const authPrivateKey = fs.readFileSync(path.join("src", "keys", "AuthPrivate.pem"), 'utf8');
const authPublicKey = fs.readFileSync(path.join("src", "keys", "AuthPublic.pem"), 'utf8');
const refreshPrivateKey = fs.readFileSync(path.join("src", "keys", "RefreshPrivate.pem"), 'utf8');
const refreshPublicKey = fs.readFileSync(path.join("src", "keys", "RefreshPublic.pem"), 'utf8');

// console.log(authPrivateKey);
// console.log(authPublicKey);

export const loginController = async (req, res) => {

    try {
        const { data, success } = userSchema.safeParse(req.body);
        const genericMessage = "invalid username or password"
        if (!success) {
            return res.status(401).json({ success: false, message: genericError });
        }
        const {email , password} = data;

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

