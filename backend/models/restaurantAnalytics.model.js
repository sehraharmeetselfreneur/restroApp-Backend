import mongoose from "mongoose";

const restaurantAnalyticsSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
    },

    totalOrders: {
        type: Number,
        default: 0,
    },

    totalRevenue: {
        type: Number,
        default: 0,
    },

    avgOrderValue: {
        type: Number,
        default: 0,
    },

    peakHours: [
        {
            hour: { type: String }, // e.g. "18:00-20:00"
            orderCount: { type: Number, default: 0 },
        },
    ],

    topSellingItems: [
        {
            foodItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FoodItem",
            },
            name: String,
            orderCount: { type: Number, default: 0 },
            revenue: { type: Number, default: 0 },
        },
    ],   
});

const restaurantAnalyticsModel = mongoose.model('RestaurantAnalytics', restaurantAnalyticsSchema);

export default restaurantAnalyticsModel;