import customerModel from "../models/customer.model.js";

export const getCustomerProfileController = async (req, res) => {
    try{
        const customer = await customerModel.findById(req.user?._id).select("-password");
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        res.status(200).json({ success: true, profile: customer });
    }
    catch(err){
        console.log("Error in getCustomerProfileController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}