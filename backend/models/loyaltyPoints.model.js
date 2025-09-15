import mongoose from "mongoose";

const loyaltyPointsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true // one loyalty account per user
    },

    pointsBalance: {
        type: Number,
        default: 0,
        min: 0
    },

    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const loyaltyPointsModel = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);

export default loyaltyPointsModel;