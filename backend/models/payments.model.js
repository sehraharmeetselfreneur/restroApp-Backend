import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true
    },

    paymentGateway: {
        type: String,
        required: true // e.g., "Razorpay", "Stripe", "Paytm"
    },

    transactionId: {
        type: String,
        required: true,
        unique: true
    },

    amount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["success", "failed", "refunded"],
        default: "success"
    },

    method: {
        type: String,
        enum: ["COD"], // can be extended later: ["UPI", "Card", "NetBanking", "COD"]
        default: "COD"
    }
}, { timestamps: true });

const paymentModel = mongoose.model('Payments', paymentSchema);

export default paymentModel;