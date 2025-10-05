import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Orders",
        required: true
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customers",
        required: true
    },

    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurants",
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

    razorpayOrderId: {
      type: String
    },

    razorpaySignature: {
      type: String
    },

    amount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "success", "failed", "refunded"],
        default: "success"
    },

    method: {
        type: String,
        enum: ["UPI", "Card", "NetBanking", "COD"],
        default: "COD"
    },

    upiApp: {
      type: String,
      enum: ["Google Pay", "PhonePe", "Paytm", "BHIM", "Other"]
    },

    paymentDetails: {
      type: Object
    },
}, { timestamps: true });

const paymentModel = mongoose.model('Payments', paymentSchema);

export default paymentModel;