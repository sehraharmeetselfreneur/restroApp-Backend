import crypto from "crypto";

import restaurantModel from "../models/restaurant.model";
import otpModel from "../models/otp.model";

export const generateOtpController = async (req, res) => {
    try{
        const { phone } = req.body;
        if(!phone){
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        const restaurant = await restaurantModel.findOne({ phone: phone });
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const newOtp = await otpModel.findOneAndUpdate(
            { phone: phone },
            { otp: otp, expiresAt: expiresAt, isUsed: false},
            { upsert: true, new:true }
        );

        //TODO: SMS or Email provider Integration

        res.status(201).json({ success: false, message: "OTP sent successfully" });
    }
    catch(err){
        console.log("Error in generateOtpController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const verifyOtpController = async (req, res) => {
    try{
        const { phone, otp } = req.body;
        if(!phone || !otp){
            return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }

        const exisitingOtp = await otpModel.findOne({ phone });
        if(!exisitingOtp){
            return res.status(404).json({ success: false, message: "OTP not found" });
        }
        if(exisitingOtp.isUsed){
            return res.status(400).json({ success: false, message: "OTP already used" });
        }
        if(exisitingOtp.expiresAt < Date.now()){
            return res.status(400).json({ success: false, message: "OTP expired" });
        }
        if(exisitingOtp.otp !== otp){
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        exisitingOtp.isUsed = true;
        await exisitingOtp.save();

        return res.status(200).json({ success: true, message: "OTP verified successfully", phone: phone });
    }
    catch(err){
        console.log("Error in verifyOtpController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}