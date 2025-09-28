import reviewModel from "../models/review.model.js";

export const getRestaurantReviewsController = async (req, res) => {
    try{
        const { id } = req.params;

        const reviews = await reviewModel.find({ restaurantId: id });

    }
    catch(err){
        console.log("Error in getRestaurantReviewsController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}