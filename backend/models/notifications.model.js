import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userType"
    },

    userType: {
        type: String,
        required: true,
        enum: ["Customer", "Restaurant", "Admin"]
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    type: {
        type: String,
        enum: ["order", "promo", "system"],
        default: "system"
    },

    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const notificationModel = mongoose.model('Notifications', notificationSchema);

export default notificationModel;