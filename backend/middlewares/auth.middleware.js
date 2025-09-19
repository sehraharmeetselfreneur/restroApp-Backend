import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    const token = req.cookies.jwt;

    if(!token){
        return res.status(403).json({ success: false, message: "No token provided" });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    }
    catch(err){
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}