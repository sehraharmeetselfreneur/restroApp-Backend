import activityLogModel from "../models/activityLogs.model";
import offerModel from "../models/offers.model";
import restaurantModel from "../models/restaurant.model";
import { createBackup } from "../services/backup.service";

export const createOfferController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const {
            foodItems,
            menuCategory,
            title,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            startDate,
            endDate
        } = req.body;

        if (!title || !discountType || !discountValue || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }
        if ((!foodItems || foodItems.length === 0) && !menuCategory) {
            return res.status(400).json({ success: false, message: "At least one food item or a menu category must be provided." });
        }
        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ success: false, message: "Start date must be before end date." });
        }

        const restaurant = await restaurantModel.findById(restaurantId);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const newOffer = await offerModel.create({
            restaurant: restaurant._id,
            foodItems: foodItems,
            menuCategory: menuCategory,
            title: title,
            description: description,
            discountType: discountType,
            discountValue: discountValue,
            minOrderAmount: minOrderAmount,
            startDate: startDate,
            endDate: endDate,
        });

        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "created_offer",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} created ${newOffer.title} offer`,
            }
        });

        createBackup("restaurants", restaurant.email, "offers", newOffer.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(201).json({
            success: true,
            message: `New offer - ${title} created`
        });
    }
    catch(err){
        console.log("Error in createOfferController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateOfferController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const { offerId } = req.params;
        const updateData = req.body;

        if (!offerId) return res.status(400).json({ success: false, message: "Offer ID is required." });

        const existingOffer = await offerModel.findById(offerId);
        if(!existingOffer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (existingOffer.restaurant.toString() !== restaurantId.toString()) return res.status(403).json({ success: false, message: "Unauthorized to update this offer." });
        if (updateData.discountValue && updateData.discountValue <= 0) return res.status(400).json({ success: false, message: "Discount value must be greater than 0." });
        if (updateData.startDate && updateData.endDate) {
            if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
                return res.status(400).json({ success: false, message: "Start date must be before end date." });
            }
        }

        const restaurant = await restaurantModel.findById(restaurantId);
        const updatedOffer = await offerModel.findByIdAndUpdate(offerId, { $set: updateData }, { new: true, runValidators: true });
        const updatedFields = Object.keys(updateData).join(", ");

        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "updated_offer",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant "${restaurant.restaurantName || "Unknown"}" updated offer "${updatedOffer.title}". Updated fields: ${updatedFields}.`,
            },
        });

        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());
        createBackup("restaurants", restaurant.email, "offers", updatedOffer.toObject());

        res.status(200).json({ success: true, message: "Offer updated successfully" });
    }
    catch(err){
        console.log("Error in updateOfferController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const deleteOfferController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const { offerId } = req.params;
        if(!offerId) return res.status(400).json({ success: false, message: "Offer ID is required" });

        const offer = await offerModel.findById(offerId);
        if(!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if (offer.restaurant.toString() !== restaurantId.toString()) return res.status(403).json({ success: false, message: "Unauthorized to delete this offer." });

        await offerModel.findByIdAndDelete(offerId);

        const restaurant = await restaurantModel.findById(restaurantId);
        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "deleted_offer",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant "${restaurant.restaurantName || "Unknown"}" deleted offer "${offer.title}".`,
            },
        });

        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());
        
        res.status(200).json({ success: true, message: "Offer deleted successfully" });
    }
    catch(err){
        console.log("Errro in deleteOfferController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const toggleOfferStatusController = async (req, res) => {
    try{

    }
    catch(err){
        console.log("Error in toggleOfferStatusController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}