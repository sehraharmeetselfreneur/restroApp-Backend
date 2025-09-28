import orderModel from "../models/orders.model";
import restaurantModel from "../models/restaurant.model";

export const updateFastDelivery = async () => {
    try {
        const FAST_DELIVERY_THRESHOLD = 30; // in minutes

        const restaurants = await restaurantModel.find({ isVerified: true });

        for (const restaurant of restaurants) {
            const deliveredOrders = await orderModel.find({
                restaurant_id: restaurant._id,
                orderStatus: "delivered",
                outForDeliveryAt: { $exists: true },
                deliveredAt: { $exists: true },
            });

            let avgDeliveryTime = 0;

            if (deliveredOrders.length > 0) {
                const totalTime = deliveredOrders.reduce((sum, order) => {
                    const timeDiff = (order.deliveredAt - order.outForDeliveryAt) / (1000 * 60); // in minutes
                    return sum + timeDiff;
                }, 0);

                avgDeliveryTime = totalTime / deliveredOrders.length;
            } else {
                avgDeliveryTime = 40;
            }

            const fastDelivery = avgDeliveryTime <= FAST_DELIVERY_THRESHOLD;

            await restaurantModel.updateOne(
                { _id: restaurant._id },
                { $set: { fastDelivery } }
            );
        }

        console.log("[Fast Delivery Cron] Restaurants updated successfully.");
    } catch (err) {
        console.error("Error in updateFastDelivery Cron: ", err.message);
    }
};