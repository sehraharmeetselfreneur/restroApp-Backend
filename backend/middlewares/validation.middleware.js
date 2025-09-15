import { validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return req.status(400).json({ success: false, errors: errors.array() });
    }

    next();
}