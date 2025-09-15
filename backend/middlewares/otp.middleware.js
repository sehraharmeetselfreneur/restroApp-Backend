export const otpMiddleware = (req, res, next) => {
    if(!req.user?.isVerified){
        return res.status(403).json({ success: false, message: "OTP not verified" });
    }

    next();
}