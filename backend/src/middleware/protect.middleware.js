
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { authCookieSchema } from '../validations/login.validator.js';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authPrivateKey = fs.readFileSync(path.join(__dirname, "..", "..", "src", "utils", "src", "keys", "AuthPrivate.pem"), 'utf8');
const authPublicKey = fs.readFileSync(path.join(__dirname, "..", "..", "src", "utils", "src", "keys", "AuthPublic.pem"), 'utf8');
const refreshPrivateKey = fs.readFileSync(path.join(__dirname, "..", "..", "src", "utils", "src", "keys", "RefreshPrivate.pem"), 'utf8');
const refreshPublicKey = fs.readFileSync(path.join(__dirname, "..", "..", "src", "utils", "src", "keys", "RefreshPublic.pem"), 'utf8');

const protect = (req, res, next) => {
    const validation = authCookieSchema.safeParse(req.cookies);

    const genericError = "not authenticated"

    if (!validation.success) {
        return res.status(401).json({ success: false, message: genericError });
    }
    const authCookie = validation.data.Authentication;
    if (!authCookie) {
        return res.status(401).json({ success: false, message: genericError })
    }
    let payload;
    try {
        payload = jwt.verify(authCookie, authPublicKey, {
            algorithms: ["RS256"],
        });

        if (!payload) {
            return res.status(401).json({ success: false, message: genericError })
        }
    } catch (e) {
        console.log("protect middleware : token verification message", e.message);
        return res.status(401).json({ success: false, message: genericError })
    }

    req.userId = payload.userId;
    
    next();
}

export default protect;