import mongoose from "mongoose";

const menuCategorySchema = new mongoose.Schema({
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurants",
        required: true
    },

    name: {
        type: String,
        enum: ["Starters", "Main Course", "Desserts", "Beverages", "Snacks", "Salads", "Soups", "Breakfast", "Sides", "Others",],
        required: true,
        trim: true
    },

    description: { type: String },

    items: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodItems"
        }
    ]
});

const menuCategoryModel = mongoose.model('MenuCategory', menuCategorySchema);

export default menuCategoryModel;