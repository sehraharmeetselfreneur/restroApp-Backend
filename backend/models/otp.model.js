import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        trim: true,
    },

    otp: {
        type: String,
        required: true,
    },

    expiresAt: {
        type: Date,
        required: true,
    },

    isUsed: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

const otpModel = mongoose.model('Otp', otpSchema);

export default otpModel;