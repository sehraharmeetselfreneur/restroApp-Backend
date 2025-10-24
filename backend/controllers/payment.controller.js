import crypto from 'crypto';
import razorpayInstance from "../lib/razorpay";
import customerModel from "../models/customer.model";
import orderModel from "../models/orders.model";
import paymentModel from "../models/payments.model";
import { createBackup } from "../services/backup.service";
import activityLogModel from '../models/activityLogs.model';

export const createPaymentController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { amount, orderId, restaurantId, method } = req.body;
        if(!amount || !orderId || !userId || !restaurantId || !method){
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const order = await orderModel.findById(orderId);
        if(!order){
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if(method === "COD"){
            const codPayment = await paymentModel.create({
                orderId: orderId,
                customerId: userId,
                restaurantId: restaurantId,
                paymentGateway: "COD",
                transactionId: `COD-${Date.now()}`,
                amount: amount,
                status: "success",
                method: "COD"
            });

            order.paymentStatus = "pending";
            order.payment_id = codPayment._id;
            await order.save();

            createBackup("customers", customer.email, "orders", order.toObject());
            createBackup("customers", customer.email, "payments", codPayment.toObject());

            return res.status(200).json({
                success: true,
                message: "COD selected successfully"
            });
        }

        const options = {
            amount: amount * 100,
            currency: "INR",
            reciept: `receipt_order_${orderId}`,
            payment_capture: 1
        }
        const razorpayOrder = await razorpayInstance.orders.create(options);

        const newPayment = await paymentModel.create({
            orderId: orderId,
            customerId: userId,
            restaurantId: restaurantId,
            paymentGateway: "Razorpay",
            transactionId: razorpayOrder.id,
            razorpayOrderId: razorpayOrder.id,
            amount: amount,
            status: "pending",
            method: method
        });

        createBackup("customers", customer.email, "payments", newPayment.toObject());

        res.status(200).json({ success: true, message: "Payment created!" });
    }
    catch(err){
        console.log("Error in createPaymentController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const verifyPaymentController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if(!razorpayOrderId || !razorpayPaymentId || !razorpaySignature){
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer) return res.status(404).json({ success: false, message: "Customer not found" });

        const payment = await paymentModel.findOne({ transactionId: razorpayOrderId });
        if(!payment) return res.status(404).json({ success: false, message: "Payment record not found" });

        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpayOrderId + "|" + razorpayPaymentId)
            .digest("hex");

        if(generatedSignature !== razorpaySignature){
            payment.status = "failed";
            await payment.save();

            const order = await orderModel.findById(payment.orderId);
            order.paymentStatus = "failed";
            await order.save();

            const newActivityLog = await activityLogModel.create({
                userId: userId,
                userType: "Customer",
                action: "payment_failed",
                metadata: {
                    ip: req.ip,
                    userAgent: req.headers["user-agent"],
                    message: `Customer ${customer.customerName} completed payment of ₹${payment.amount}`,
                    paymentId: payment._id,
                    orderId: order._id,
                }
            });

            createBackup("customers", customer.email, "payments", payment.toObject());
            createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());
            createBackup("customers", customer.email, "orders", order.toObject());

            res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        payment.status = "success";
        payment.transactionId = razorpayPaymentId;
        await payment.save();

        const order = await orderModel.findById(payment.orderId);
        order.paymentStatus = "paid";
        await order.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "payment_success",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} completed payment of ₹${payment.amount}`,
                paymentId: payment._id,
                orderId: order._id,
            }
        });

        createBackup("customers", customer.email, "payments", payment.toObject());
        createBackup("customers", customer.email, "activityLogs", newActivityLog.toObject());
        createBackup("customers", customer.email, "orders", order.toObject());

        res.status(200).json({ success: true, message: "Payment verified" });
    }
    catch(err){
        console.log("Error in verifyPaymentController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getPaymentStatusController = async (req, res) => {
    try{
        const { orderId } = req.params;
        if(!orderId) return res.status(400).json({ success: false, message: "Order ID is required" });

        const payment = await paymentModel.findOne({ orderId: orderId }).populate("orderId customerId restaurantId")
        if(!payment) return res.status(404).json({ success: false, message: "Payment not found" });

        const order = await orderModel.findById(orderId)

        res.status(200).json({
            success: true,
            paymentStatus: payment.status,
            paymentDetails: {
                transactionId: payment.transactionId,
                method: payment.method,
                gateway: payment.paymentGateway,
                amount: payment.amount,
                orderPaymentStatus: order?.paymentStatus || "pending"
            }
        });
    }
    catch(err){
        console.log("Error in getPaymentStatusController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}