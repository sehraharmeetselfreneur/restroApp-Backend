import activityLogModel from "../models/activityLogs.model.js";
import cartModel from "../models/cart.model.js";
import customerModel from "../models/customer.model.js";
import foodItemModel from "../models/foodItems.model.js";
import { createBackup } from "../services/backup.service.js";

export const addToCartController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { itemId, variantId, quantity, addons, notes } = req.body;
        if(!itemId || !quantity){
            return res.status(400).json({ success: false, message: "Item and quantity are required" });
        }

        const customer = await customerModel.findById(userId);

        const item = foodItemModel.findById(itemId);
        if(!item){
            return res.status(400).json({ success: false, message: "Item not found" });
        }

        let variant = null;
        if (variantId) {
            variant = item.variants.id(variantId);
            if (!variant) {
                return res.status(400).json({ success: false, message: "Variant not found" });
            }
        }

        let cart = await cartModel.findOne({ userId: userId }).populate("items.foodItemId");
        if(!cart){
            cart = await cartModel.create({
                userId: userId,
                userType: "Customer",
                items: [{
                    Id: itemId,
                    variantId: variant?._id || null,
                    quantity: quantity,
                    addons: addons || [],
                    notes: notes || ""
                }]
            });
        }
        else{
            const existingIndex = cart.items.findIndex(item =>
                item.foodItemId._id.toString() === itemId &&
                ((variantId && ci.variantId?.toString() === variantId) || (!variantId && !item.variantId))
            );

            if(existingIndex > -1){
                cart.items[existingIndex].quantity += quantity;
            }
            else{
                cart.items.push({
                    foodItemId: itemId,
                    variantId: variantId || null,
                    quantity: quantity,
                    addons: addons || []
                });
            }
        }

        let total = 0;
        cart.items.forEach(item => {
            const basePrice = item.foodItemId.price || 0;
            const variantPrice = item.variantId ? item.foodItemId.variants.id(item.variantId)?.price || 0 : 0;
            const addonsTotal = item.addons?.reduce((sum, foodItem) => sum + foodItem.price, 0) || 0;
            total += item.quantity * (basePrice + variantPrice + addonsTotal);
        });
        cart.totalAmount = total;
        await cart.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "added_to_cart",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} added ${itemId} to the cart`
            }
        });

        createBackup("customers", customer.email, "cart", cart.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: "Item added to cart" });
    }
    catch(err){
        console.log("Error in addToCartController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const removeFromCartController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { foodItemId, variantId } = req.params;
        console.log(req.params);
        if(!foodItemId){
            return res.status(400).json({ success: false, message: "foodItemId is required" });
        }

        const customer = await customerModel.findById(userId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const cart = await cartModel.findOne({ userId: userId }).populate("items.foodItemId", "price name");;
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        let itemFound = false;
        const updatedItems = cart.items.map((item) => {
            const foodMatches = item.foodItemId._id.toString() === foodItemId;
            const variantMatches = !variantId.includes('[') ? item.variantId?.toString() === variantId.toString() : !item.variantId;
        
            if (foodMatches && variantMatches) {
                itemFound = true;
                if (item.quantity > 1) {
                    return { ...item._doc, quantity: item.quantity - 1 };
                } else {
                    return null; // remove item
                }
            }
        
            return item;
        }).filter(Boolean);

        if (!itemFound) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }
        cart.items = updatedItems;

        let total = 0;
        cart.items.forEach((item) => {
            let basePrice = item.foodItemId.price || 0;

            if (item.variantId) {
                const variant = item.foodItemId.variants.find(
                    (variant) => variant._id.toString() === item.variantId.toString()
                );
                if (variant) basePrice = variant.price;
            }

            const addonsTotal = item.addons?.reduce((acc, addon) => acc + addon.price, 0) || 0;
            total += (item.quantity * basePrice) + addonsTotal;
        });
        cart.totalAmount = total;
        await cart.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "removed_from_cart",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} removed ${foodItemId} from the cart`
            }
        });

        createBackup("customers", customer.email, "cart", cart.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: "Item removed from cart"
        });
    }
    catch(err){
        console.log("Error in removeFromCartController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const removeFoodItemFromCartController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { foodItemId, variantId } = req.body;

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        let cart = await cartModel.findOne({ userId: userId }).populate("items.foodItemId");
        if(!cart){
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        console.log("Items before filter:", cart.items.length);
        // Filter out the item to be removed
        cart.items = cart.items.filter(item => {
            const foodMatches = item.foodItemId._id.toString() === foodItemId;
            const variantMatches = variantId ? item.variantId?.toString() === variantId.toString() : !item.variantId;
            return !(foodMatches && variantMatches);
        });
        console.log("Items after filter:", cart.items.length);

        // Recalculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => {
            const itemPrice = item.foodItemId.discount_price || item.foodItemId.price;
            const addonsPrice = item.addons?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
            return total + ((itemPrice + addonsPrice) * item.quantity);
        }, 0);

        await cart.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "removed_from_cart",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} removed a foodItem from their cart`
            }
        });

        createBackup("customers", customer.email, "cart", cart.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());

        return res.status(200).json({ 
            success: true, 
            message: "Food item removed from cart",
            cart: cart // Send back updated cart
        });
    }
    catch(err){
        console.log("Error in removeFoodItemFromCartController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const clearCartController = async (req, res) => {
    try{
        const userId = req.user?._id;
        if(!userId){
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const cart = await cartModel.findOne({ userId: userId });
        if(!cart){
            return res.status(404).json({ success: true, message: "Cart not found" });
        }

        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "cleared_cart",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} cleared their cart`
            }
        });

        createBackup("customers", customer.email, "cart", cart.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: "Cart cleared successfully" });
    }
    catch(err){
        console.log("Error in clearCartController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}