import mongoose from "mongoose";

const activityLogsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "userType",
        required: true
    },

    userType: {
        type: String,
        required: true,
        enum: ["Customer", "Restaurant", "Admin"]
    },

    action: {
        type: String,
        required: true,
        trim: true,
        enum: [
            "registered",
            "login",
            "logout",
            "viewed_restaurant",
            "added_menu_category",
            "added_food_item",
            "updated_food_item",
            "deleted_food_item",
            "viewed_food_item",
            "added_to_cart",
            "removed_from_cart",
            "cleared_cart",
            "placed_order",
            "cancelled_order",
            "updated_profile",
            "applied_coupon",
            "made_payment",
            "verify_restaurant",
            "reject_restaurant",
            "other",
        ],
    },

    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

const activityLogModel = mongoose.model('ActivityLogs', activityLogsSchema);

export default activityLogModel;