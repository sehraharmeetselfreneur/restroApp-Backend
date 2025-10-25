import activityLogModel from "../models/activityLogs.model.js";
import foodItemModel from "../models/foodItems.model.js";
import offerModel from "../models/offers.model.js";
import restaurantModel from "../models/restaurant.model.js";
import { createBackup } from "../services/backup.service.js";

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
            endDate,
            offerType,
            isActive
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
            offerType: offerType,
            description: description,
            discountType: discountType,
            discountValue: Number(discountValue),
            minOrderAmount: Number(minOrderAmount),
            startDate: startDate,
            endDate: endDate,
            isActive: isActive
        });

        if (isActive === "active") {
            let foodItemsToUpdate = [];

            if (foodItems && foodItems.length > 0) {
                //specific items selected
                foodItemsToUpdate = await foodItemModel.find({
                    _id: { $in: foodItems },
                    restaurant_id: restaurant._id,
                });
            } else if (menuCategory && menuCategory.length > 0) {
                //categories selected
                foodItemsToUpdate = await foodItemModel.find({
                    category_id: { $in: menuCategory },
                    restaurant_id: restaurant._id,
                });
            }
          
            //Apply discount to each food item (and variants)
            for (let item of foodItemsToUpdate) {
                const basePrice = item.price;
                let discountedPrice = basePrice;
                
                if (discountType === "percentage") {
                    discountedPrice = basePrice - (basePrice * discountValue) / 100;
                } else if (discountType === "flat") {
                    discountedPrice = Math.max(basePrice - discountValue, 0);
                }
              
                item.discount_price = discountedPrice;
              
                //Apply discount to each variant if any
                if (item.variants && item.variants.length > 0) {
                    item.variants = item.variants.map((v) => {
                        let discountedVariantPrice = v.price;
                        if (discountType === "percentage") {
                            discountedVariantPrice = v.price - (v.price * discountValue) / 100;
                        } else if (discountType === "flat") {
                            discountedVariantPrice = Math.max(v.price - discountValue, 0);
                        }
                        return { ...v.toObject(), price: discountedVariantPrice };
                    });
                }
              
                await item.save();
            }
        }

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
            message: `New offer "${title}" created${isActive === "active" ? " and applied successfully." : "."}`
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
        const restaurantId = req.user?._id;
        const { offerId } = req.params;

        const restaurant = await restaurantModel.findById(restaurantId);
        if(!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

        const offer = await offerModel.findById(offerId);
        if(!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if(offer.restaurant.toString() !== restaurantId.toString()) return res.status(401).json({ success: false, message: "You are not authorized to toggle this offer" })

        offer.isActive = !offer.isActive;
        await offer.save();

        const newActivityLog = await activityLogModel.create({
            userId: restaurantId,
            userType: "Restaurant",
            action: offer.isActive === true ? "activated_offer" : "deactivated_offer",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant "${restaurant.restaurantName || "Unknown"}" ${offer.isActive ? "activated" : "deactivated"} offer "${offer.title}".`,
            }
        });

        createBackup("restaurants", restaurant.email, "offers", offer.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: `Offer ${offer.isActive ? "activated" : "deactivated"} successfully` });
    }
    catch(err){
        console.log("Error in toggleOfferStatusController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const applyOfferToItemsController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const { offerId } = req.params;

        const restaurant = await restaurantModel.findById(restaurantId);
        if(!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

        const offer = await offerModel.findById(offerId).populate("foodItems").populate("menuCategory");
        if(!offer) return res.status(404).json({ success: false, message: "Offer not found" });
        if(offer.restaurant.toString() !== restaurantId.toString()) return res.status(401).json({ success: false, message: "You are not authorized to modify this offer" });

        const { discountType, discountValue, foodItems, menuCategory } = offer;
        let updatedItems = [];

        if(foodItems?.length > 0){
            const items = await foodItemModel.find({ _id: { $in: foodItems } });
            for (const item of items){
                const originalPrice = item.price;
                const newDiscountPrice =
                    discountType === "percentage"
                    ? Math.max(0, originalPrice - (originalPrice * discountValue) / 100)
                    : Math.max(0, originalPrice - discountValue);

                item.discount_price = newDiscountPrice;
                await item.save();
                updatedItems.push(item);
            }
        }

        if(menuCategory?.length > 0){
            const itemsInCategory = await foodItemModel.find({ category_id: { $in: menuCategory } });
            for(const item of itemsInCategory){
                const originalPrice = item.price;
                const newDiscountPrice =
                    discountType === "percentage"
                    ? Math.max(0, originalPrice - (originalPrice * discountValue) / 100)
                    : Math.max(0, originalPrice - discountValue);
                
                item.discount_price = newDiscountPrice;
                await item.save();
                updatedItems.push(item);
            }
        }

        const newActivityLog = await activityLogModel.create({
            userId: restaurantId,
            userType: "Restaurant",
            action: "applied_offer_prices",
            metadata: {
              ip: req.ip,
              userAgent: req.headers["user-agent"],
              message: `Restaurant "${restaurant.restaurantName || "Unknown"}" applied offer "${offer.title}" to ${updatedItems.length} items.`,
            }
        });

        await Promise.all([
            createBackup("restaurants", restaurant.email, "offers", offer.toObject()),
            createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject()),
            createBackup("restaurants", restaurant.email, "foodItems", updatedItems.map((item) => item.toObject()))
        ]);

        res.status(200).json({ success: true, message: `Offer "${offer.title}" applied successfully to ${updatedItems.length} items.` })
    }
    catch(err){
        console.log("Error in applyOfferToItemsController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}