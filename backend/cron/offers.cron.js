import offerModel from "../models/offers.model.js";

export const updateOffersStatus = async () => {
    try{
        const now = new Date();

        const expiredOffers = await offerModel.updateMany({
            endDate: { $lte: now },
            isActive: true
        }, { $set: { isActive: false } });

        const activatedOffers = await offerModel.updateMany({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: false
        }, { $set: { isActive: true } });

        console.log(`[Offer Cron] ${expiredOffers.modifiedCount} expired, ${activatedOffers.modifiedCount} activated at ${now.toISOString()}`);
    }
    catch(err){
        console.log("Error in expireOffers: ", err.message);
    }
}