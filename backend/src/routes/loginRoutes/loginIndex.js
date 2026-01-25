import express from 'express';
import { loginHandler, logoutController, refreshTokenHandler, registerHandler } from '../../controllers/login/loginController.js';
import protect from '../../middleware/protect.middleware.js';
import { rateLimit } from 'express-rate-limit'

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
})

const router = express.Router();

router.get('/me', protect ,(req, res) =>{
	res.status(200).json({success : true , message : "user authenticated"});
})
router.post('/login', limiter , loginHandler )

router.post('/signup', limiter , registerHandler )
router.post('/refreshToken', limiter , refreshTokenHandler )
router.post('/logout', limiter , logoutController )
*/

// router.post('/forgetPassword', limiter , forgetPasswordHandler )
// router.post('/resetPassword', limiter , resetPasswordHandler )


export default router;