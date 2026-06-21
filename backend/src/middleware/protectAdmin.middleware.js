import jwt from "jsonwebtoken";
import Admin from "../models/admin/admin.js";

import { adminAuthPublicKey } from "../utils/getKeys.js";
const protectAdmin = async (req, res, next) => {
  try {
    // console.log(req.cookies);

    const token = req.cookies["Admin-Authentication"];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    // console.log(token);

    const payload = jwt.verify(token, adminAuthPublicKey, {
      algorithms: ["RS256"],
    });
    const currentAdmin = await Admin.findById(payload.userId);

    if (!currentAdmin) {
      res.clearCookie("Admin-Authentication");

      return res.status(401).json({
        success: false,
        message: "The admin belonging to this token no longer exists.",
      });
    }

    req.userId = payload.userId;

    req.admin = currentAdmin;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    console.error("protectAdmin middleware verification error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Not authenticated - Invalid Token" });
  }
};

export default protectAdmin;
