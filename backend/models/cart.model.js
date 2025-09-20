import mongoose from "mongoose";

const cartItemsSchema = new mongoose.Schema({
    foodItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    quantity: {
        type: Number,
        default: 1,
        min: 1
    },

    addons: [
        {
            name: String,
            price: Number
        }
    ],

    notes: {
        type: String,
        trim: true
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userType"
    },

    userType: {
        type: String,
        enum: ["Customer", "Restaurant"],
        required: true
    },

    items: [cartItemsSchema],

    totalAmount: {
        type: Number,
        default: 0
    }
});

const cartModel = mongoose.model('Carts', cartSchema);

export default cartModel;