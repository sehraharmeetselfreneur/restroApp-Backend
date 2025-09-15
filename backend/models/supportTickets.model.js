import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },

    issueType: {
        type: String,
        required: true,
        enum: ["delivery", "refund", "website issue", "restaurant issue", "other"]
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    status: {
        type: String,
        enum: ["open", "inProgress", "resolved", "closed"],
        default: "open"
    }
}, { timestamps: true });

const supportTicketModel = mongoose.model('SupportTicket', supportTicketSchema);

export default supportTicketModel;