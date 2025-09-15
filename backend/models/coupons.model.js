import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    discountType: {
        type: String,
        enum: ["PERCENTAGE", "FLAT"], // % based or fixed amount
        required: true
    },

    discountValue: {
        type: Number,
        required: true,
        min: 0
    },

    minOrderAmount: {
        type: Number,
        required: true,
        min: 0
    },

    validFrom: {
        type: Date,
        required: true
    },

    validTill: {
        type: Date,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

const couponModel = mongoose.model('Coupons', couponSchema);

export default couponModel;