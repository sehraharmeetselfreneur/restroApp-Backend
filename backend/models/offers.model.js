import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    restaurant: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Restaurants", 
      required: true 
    },

    foodItems: [
      { type: mongoose.Schema.Types.ObjectId, ref: "FoodItems" }
    ],

    menuCategory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuCategory"
        }
    ],

    offerType: {
        type: String,
        enum: ["category", "item"],
        required: true
    },

    title: { type: String, required: true },

    description: { type: String },

    discountType: { 
      type: String, 
      enum: ["percentage", "flat"], 
      required: true 
    },

    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const offerModel = mongoose.model('Offers', offerSchema);

export default offerModel;