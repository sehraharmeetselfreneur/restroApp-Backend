import orderModel from "../models/orders.model";

export const updateOrderStatus = async (req, res) => {
    try{
        const { orderId } = req.params;
        const { status } = req.body;

        const updateFields = { orderStatus: status };

        if(status === "outForDelivery"){
            updateFields.outForDeliveryAt = new Date();
        }
        else if(status === "delivered"){
            updateFields.deliveredAt = new Date();
        }

        const order = await orderModel.findOneAndUpdate(orderId, updateFields, { new: true });
        if(!order){
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: `Order updated as ${status}` });
    }
    catch(err){
        console.log("Error in updateOrderStatusController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}