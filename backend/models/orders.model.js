import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    foodItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
        required: true
    },

    variant: {
        type: String
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    price: {
        type: Number,
        required: true
    },

    subtotal: {
        type: Number,
        required: true
    }
});

const ordersSchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
    },

    orderStatus: {
        type: String,
        enum: [
            "pending",
            "accepted",
            "preparing",
            "outForDelivery",
            "delivered",
            "cancelled",
            "refunded",
        ],
        default: "pending",
    },

    items: [orderItemSchema],

    special_instructions: {
        type: String,
        trim: true,
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending",
    },
    
    totalAmount: {
        type: Number,
        required: true,
    },

    deliveryFee: {
        type: Number,
        default: 0,
    },

    discountApplied: {
        type: Number,
        default: 0,
    },

    finalAmount: {
        type: Number,
        required: true,
    },

    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        landmark: { type: String },
    },
}, { timestamps: true });

const orderModel = mongoose.model("Orders", ordersSchema);

export default orderModel;