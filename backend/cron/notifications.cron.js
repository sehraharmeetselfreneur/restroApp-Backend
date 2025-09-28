import customerModel from "../models/customer.model.js";
import offerModel from "../models/offers.model.js";
import { sendNotification } from "../services/notification.service.js";

export const sendOfferNotifications = async () => {
    try{
        const now = new Date();

        const recentOffers = await offerModel.find({
            startDate: { $lte: now, $gt: new Date(now.getTime() - 60 * 60 * 1000) },
            isActive: true
        }).populate("restaurant foodItems menuCategory");
        if(recentOffers.length === 0){
            console.log("[Offer Notifications] No new offers to notify.");
            return;
        }

        const users = await customerModel.find({ status: "active" });
        for(const offer of recentOffers){
            for(const user of users){
                const message = `New Offer from ${offer.restaurant.restaurantName}: ${offer.title} - ${offer.description || ""} Valid till ${offer.endDate.toDateString()}`;
                await sendNotification(user._id, user.role, message, "promo");
            }
        }

        console.log(`[Offer Notifications] Sent notifications for ${recentOffers.length} offer(s).`);
    }
    catch(err){
        console.log("Error in sendOfferNotifications: ", err.message);
    }
}