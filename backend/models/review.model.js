import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Orders",
        required: true
    },

    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customers",
        required: true
    },

    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurants",
        required: true
    },

    foodItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItems",
        required: false
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },

    comment: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const reviewModel = mongoose.model('Reviews', reviewSchema);

export default reviewModel;