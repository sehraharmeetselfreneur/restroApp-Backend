//Required models
import activityLogModel from "../models/activityLogs.model.js";
import cartModel from "../models/cart.model.js";
import customerModel from "../models/customer.model.js";
import loyaltyPointsModel from "../models/loyaltyPoints.model.js";

//Required services
import { createBackup } from "../services/backup.service.js";

export const registerCustomerController = async (req, res) => {
    try{
        const {
            customerName,
            email,
            password,
            phone,
            dob,
            gender,
            address
        } = req.body;
        const profileImage = req.file.path ? req.file.path.replace(/\\/g, "/").split("KYC/")[1]
            ? "/KYC/" + req.file.path.replace(/\\/g, "/").split("KYC/")[1]
            : null
            : null;

        let parsedAddress = [];
        if(address){
            try {
                const addr = typeof address === "string" ? JSON.parse(address) : address;
                parsedAddress = Array.isArray(addr) ? addr : [addr];
            }
            catch(err){
                return res.status(400).json({ success: false, message: "Invalid address format" });
            }
        }

        const existingCustomer = await customerModel.findOne({ $or: [{ email }, { phone }] });
        if(existingCustomer){
            return res.status(400).json({ success: false, message: "Customer already exists" });
        }

        const hashedPassword = await customerModel.hashPassword(password);
        const newCustomer = await customerModel.create({
            customerName: customerName,
            email: email,
            phone: phone,
            password: hashedPassword,
            dob: dob,
            gender: gender,
            profileImage: profileImage,
            address: parsedAddress,
        });
        newCustomer.address[0].isDefault = true;
        await newCustomer.save();

        const newCart = await cartModel.create({
            userId: newCustomer._id,
            userType: "Customer"
        });

        const newLoyaltyPoints = await loyaltyPointsModel.create({ userId: newCustomer._id });

        const newActivityLog = await activityLogModel.create({
            userId: newCustomer._id,
            userType: "Customer",
            action: "registered",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${newCustomer.customerName} registered and logged in`
            }
        });

        createBackup("customers", newCustomer.customerName, "customer", newCustomer.toObject());
        createBackup("customers", newCustomer.customerName, "cart", newCart.toObject());
        createBackup("customers", newCustomer.customerName, "loyaltyPoints", newLoyaltyPoints.toObject());
        createBackup("customers", newCustomer.customerName, "activityLogs", newActivityLog.toObject());

        const token = newCustomer.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: `Customer ${newCustomer.customerName} registered successfully`,
            token,
            customer: {
                id: newCustomer._id,
                customerName: newCustomer.customerName,
                email: newCustomer.email,
                phone: newCustomer.phone,
                dob: newCustomer.dob,
                gender: newCustomer.gender,
                profileImage: newCustomer.profileImage,
                address: newCustomer.address
            }
        });
    }
    catch(err){
        console.log("Error in registerCustomerController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const loginCustomerController = async (req, res) => {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({ success: false, message: "Email and password is required" });
        }
        
        const customer = await customerModel.findOne({ email: email });
        if(!customer){
            return res.status(404).json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordCorrect = await customer.comparePassword(password);
        if(!isPasswordCorrect){
            return res.status(400).json({ success: false, message: "Email or password is incorrect" });
        }

        const token = customer.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        const newActivityLog = await activityLogModel.create({
            userId: customer._id,
            userType: "Customer",
            action: "login",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} logged in`
            }
        });

        createBackup("customers", customer.customerName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: `Welcome back, ${customer.customerName}!`,
            token,
            customer: {
                id: customer._id,
                customerName: customer.customerName,
                email: customer.email,
                phone: customer.phone,
                dob: customer.dob,
                gender: customer.gender,
                profileImage: customer.profileImage,
                address: customer.address
            }
        });
    }
    catch(err){
        console.log("Error in loginCustomerController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const logoutCustomerController = async (req, res) => {
    try{
        const customerId = req.user?._id;
        const customer = await customerModel.findById(customerId);

        res.clearCookie("jwt");

        const newActivityLog = await activityLogModel.create({
            userId: customerId,
            userType: "Customer",
            action: "logout",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName || "Unknown"} logged out`,
            },
        });

        createBackup("customers", customer.customerName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: "Customer logged out successfully" });
    }
    catch(err){
        console.log("Error in logoutCustomerController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getCustomerProfileController = async (req, res) => {
    try{
        const customer = await customerModel.findById(req.user?._id).select("-password");
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const cart = await cartModel.findOne({ userId: customer._id }).populate("items.foodItemId");
        const loyaltyPoints = await loyaltyPointsModel.findOne({ userId: customer._id });

        res.status(200).json({
            success: true,
            profile: customer,
            cart: cart,
            loyaltyPoints: loyaltyPoints
        });
    }
    catch(err){
        console.log("Error in getCustomerProfileController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const addAddressController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const {
            street,
            city,
            state,
            pincode,
            landmark,
            tag
        } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!street || !city || !state || !pincode || !tag) {
            return res.status(400).json({ success: false, message: "All required address fields must be provided" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const newAddress = {
            street: street,
            city: city,
            state: state,
            pincode: pincode,
            landmark: landmark,
            tag: tag
        };

        customer.address.push(newAddress); 
        await customer.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "added_new_address",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} added a new address: ${street}, ${city}`,
            }
        });

        createBackup("customers", customer.customerName, "customer", customer.toObject());
        createBackup("customers", customer.customerName, "activityLogs", newActivityLog.toObject());

        res.status(201).json({ success: true, message: "New Address added!" });
    }
    catch(err){
        console.log("Error in addAddressController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateAddressController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { tag } = req.params;
        const { street, city, state, pincode, landmark } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }
        if (!tag) {
            return res.status(400).json({ success: false, message: "Address tag is required" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const addressIndex = customer.address.findIndex(address => address.tag === tag);
        if(addressIndex === -1){
            return res.status(404).json({ success: false, message: "Address not found with this tag" });
        }

        if (street) customer.address[addressIndex].street = street;
        if (city) customer.address[addressIndex].city = city;
        if (state) customer.address[addressIndex].state = state;
        if (pincode) customer.address[addressIndex].pincode = pincode;
        if (landmark) customer.address[addressIndex].landmark = landmark;
        await customer.save();

        res.status(200).json({ success: true, message: `${tag} address updated!` });
    }
    catch(err){
        console.log("Error in updateAddressController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const deleteAddressController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const { tag } = req.params;

        if(!userId){
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        if(!tag){
            return res.status(400).json({ success: false, message: "Tag of the address is required" });
        }

        if(tag === "Home"){
            return res.status(400).json({ succes: false, message: "Default address cannot be deleted" });
        }

        const customer = await customerModel.findById(userId);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        const initialLength = customer.address.length;
        customer.address = customer.address.filter(address => address.tag.toLowerCase() !== tag.toLowerCase());
        if(initialLength === customer.address.length){
            return res.status(404).json({ success: false, message: "Address with this tag not found" });
        }

        await customer.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Customer",
            action: "deleted_address",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Customer ${customer.customerName} deleted an address with tag ${tag}`
            }
        });

        createBackup("customers", customer.customerName, "customer", customer.toObject());
        createBackup("customers", customer.customerName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: `${tag} deleted successfully!` });
    }
    catch(err){
        console.log("Error in deleteAddressController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}