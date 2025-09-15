import mongoose from "mongoose";

const restaurantBankDetailsSchema = new mongoose.Schema({
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
    },

    accountHolderName: {
        type: String,
        required: true
    },

    accountNumber: {
        type: String,
        required: true
    },

    IFSC: {
        type: String,
        required: true
    },

    bankName: {
        type: String,
        required: true
    },

    upi_id: { type: String },
}, { timestamps: true });

const restaurantBankDetailsModel = mongoose.model('RestaurantBankDetails', restaurantBankDetailsSchema);

export default restaurantBankDetailsModel;