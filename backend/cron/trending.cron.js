import orderModel from "../models/orders.model.js";
import restaurantModel from "../models/restaurant.model.js";

export const updateTrendingRestaurants = async () => {
    try{
        console.log("Updating trending restaurants...");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const restaurants = await restaurantModel.find();
        for(const restaurant of restaurants){
            const recentOrders = await orderModel.countDocuments({
                restaurant_id: restaurant._id,
                createdAt: { $gte: sevenDaysAgo }
            });

            const trendingScore = recentOrders * 2 (restaurant.rating|| 0) * 10;
            const isTrending = trendingScore >= 15;

            restaurant.isTrending = isTrending;
            await restaurant.save();
        }

        console.log("Trending restaurants updated successfully!");
    }
    catch(err){
        console.log("Error in updateTrendingRestaurants: ", err.message);
    }
}