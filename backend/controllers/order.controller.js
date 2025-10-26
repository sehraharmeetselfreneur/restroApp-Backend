import haversine from "haversine-distance";

import activityLogModel from "../models/activityLogs.model.js";
import cartModel from "../models/cart.model.js";
import customerModel from "../models/customer.model.js";
import orderModel from "../models/orders.model.js";
import restaurantModel from "../models/restaurant.model.js";
import { createBackup } from "../services/backup.service.js";
import paymentModel from "../models/payments.model.js";
import foodItemModel from "../models/foodItems.model.js";

export const createOrderController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const {
            restaurant_id,
            deliveryAddress,
            special_instructions,
            paymentType,
            deliveryFee = 0,
            discountApplied = 0
        } = req.body.orderData;

        console.log(req.body.orderData);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const customer = await customerModel.findById(userId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const restaurant = await restaurantModel.findById(restaurant_id);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        let cart = await cartModel.findOne({ userId: userId }).populate("items.foodItemId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const restaurantCoords = {
            latitude: restaurant.address.geoLocation.coordinates[1],
            longitude: restaurant.address.geoLocation.coordinates[0]
        };
        const customerCoords = {
            latitude: deliveryAddress.coordinates[1],
            longitude: deliveryAddress.coordinates[0]
        };

        const distanceInMeters = haversine(customerCoords, restaurantCoords);
        const distanceInKm = (distanceInMeters / 1000).toFixed(2);

        const orderItems = cart.items.map(item => {
            const basePrice = item.foodItemId.price || 0;
            let price = basePrice;

            if (item.variantId) {
                const variant = (item.foodItemId.variants || []).find(v => String(v._id) === String(item.variantId));
                if(variant)price = variant.price;
            }

            const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (addon.price || 0), 0);
            const finalPrice = price + addonsTotal;

            return {
                foodItem: item.foodItemId._id,
                variant: item.variantId ? String(item.variantId) : null,
                quantity: item.quantity,
                price: finalPrice,
                subtotal: finalPrice * item.quantity,
            };
        });

        await Promise.all(
            cart.items.map(async (item) => {
                await foodItemModel.findByIdAndUpdate(
                    item.foodItemId._id,
                    { $inc: { ordersCount: 1 } },
                    { new: true }
                );
            })
        );

        const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const taxAndCharges = totalAmount * 0.05;
        const finalAmount = totalAmount + deliveryFee - discountApplied + taxAndCharges;
 
        let paymentRecord;
        if (paymentType === "COD") {
            paymentRecord = await paymentModel.create({
                orderId: null,
                customerId: userId,
                restaurantId: restaurant_id,
                paymentGateway: "COD",
                transactionId: `COD-${Date.now()}`,
                amount: totalAmount,
                status: "success",
                method: "COD"
            });
        }

        const newOrder = await orderModel.create({
            customer_id: userId,
            restaurant_id: restaurant_id,
            items: orderItems,
            special_instructions: special_instructions,
            paymentStatus: "pending",
            paymentType: paymentType,
            totalAmount: totalAmount,
            deliveryFee: deliveryFee,
            discountApplied: discountApplied,
            finalAmount: finalAmount,
            deliveryAddress: deliveryAddress,
            distance: distanceInKm
        });

        if (paymentRecord) {
            paymentRecord.orderId = newOrder._id;
            await paymentRecord.save();
        }

        customer.orders.push(newOrder._id);
        restaurant.orders.push(newOrder._id);
        cart.items = [];
        cart.totalAmount = 0;
        await cart.save();
        await restaurant.save();
        await customer.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action : "placed_order",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} placed an order worth ₹${finalAmount}`,
                orderId: newOrder._id,
            }
        });

        createBackup("customers", customer.email, "orders", newOrder.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());

        res.status(201).json({ success: true, message: "Order placed successfully" });
    }
    catch(err){
        console.log("Error in createOrderController: ", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateOrderStatusController = async (req, res) => {
    try{
        const { orderId } = req.params;
        const { status } = req.body;
        
        if(!orderId){
            return res.status(400).json({ success: false, message: "OrderId is required" });
        }

        const updateFields = { orderStatus: status };

        if(status === "outForDelivery"){
            updateFields.outForDeliveryAt = new Date();
        }
        else if(status === "delivered"){
            updateFields.deliveredAt = new Date();
        }

        const order = await orderModel.findOneAndUpdate({ _id: orderId }, updateFields, { new: true });
        if(!order){
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: `Order updated to ${status}` });
    }
    catch(err){
        console.log("Error in updateOrderStatusController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}