import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userType", // dynamic ref (Customer / Restaurant)
    },

    userType: {
        type: String,
        required: true,
        enum: ["Customer", "Restaurant"],
    },

    searchText: {
        type: String,
        required: true,
        trim: true,
    },

    filtersApplied: {
        type: mongoose.Schema.Types.Mixed, 
        default: {}, 
        // can hold flexible filter data like { cuisine: "Indian", priceRange: "100-500" }
    }
}, { timestamps: true });

const searchHistoryModel = mongoose.model('SearchHistory', searchHistorySchema);

export default searchHistoryModel;