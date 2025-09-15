import mongoose from "mongoose";

const adminAnalyticsSchema = new mongoose.Schema({
    totalUsers: {
        type: Number,
        default: 0,
    },

    totalRestaurants: {
        type: Number,
        default: 0,
    },

    totalOrders: {
        type: Number,
        default: 0,
    },

    totalRevenue: {
        type: Number,
        default: 0,
    },

    dailyActiveUsers: {
        type: Number,
        default: 0,
    },

    monthlyActiveUsers: {
        type: Number,
        default: 0,
    },

    churnRate: {
        type: Number,
        default: 0, // percentage of users lost
    },
});

const adminAnalyticsModel = mongoose.model('AdminAnalytics', adminAnalyticsSchema);

export default adminAnalyticsModel;