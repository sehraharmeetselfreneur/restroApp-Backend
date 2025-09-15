import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    quantity: { type: String },

    calories: { type: Number },

    addons: [{ type: String }],

    isAvailable: {
        type: Boolean,
        default: true
    },
});

const foodItemSchema = new mongoose.Schema({
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true,
    },

    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuCategory",
        required: true,
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    images: [{ type: String }],

    price: {
        type: Number,
        required: true
    },

    discount_price: { type: Number },

    isAvailable: {
        type: Boolean,
        default: true
    },

    preparationTime: {
        type: Number,
        default: 15
    },

    isVeg: {
        type: Boolean,
        default: true
    },

    tags: [{ type: String }], // e.g., spicy, vegan, gluten-free

    variants: [variantSchema], // Half / Full / Custom options
}, { timestamps: true } );

const foodItemModel = mongoose.model('FoodItems', foodItemSchema);

export default foodItemModel;