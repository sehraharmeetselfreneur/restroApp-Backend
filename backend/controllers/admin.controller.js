import activityLogModel from "../models/activityLogs.model.js";
import adminModel from "../models/admin.model.js";
import customerModel from "../models/customer.model.js";
import orderModel from "../models/orders.model.js";
import restaurantModel from "../models/restaurant.model.js";
import restaurantBankDetailsModel from "../models/restaurant_bank_details.model.js";
import foodItemModel from "../models/foodItems.model.js";
import menuCategoryModel from "../models/menu_categories.model.js";

// Services functions
import { createBackup } from "../services/backup.service.js";
import { decrypt } from "../services/encryption.service.js";
import adminAnalyticsModel from "../models/adminAnalytics.model.js";

export const registerAdminController = async (req, res) => {
    try{
        const {
            adminName,
            email,
            password,
            phone,
            role,
            permissions
        } = req.body;

        console.log(req.body);
        const profileImage = req.file.path || null;

        if (typeof permissions === "string") {
            permissions = JSON.parse(permissions);
        }

        const existingAdmin = await adminModel.findOne({ $or: [{ email: email }, { phone: phone }] });
        if(existingAdmin){
            return res.status(400).json({ success: false, message: "Admin doesn't exist" });
        }

        const hashedPassword = await adminModel.hashPassword(password);
        const newAdmin = await adminModel.create({
            adminName: adminName,
            email: email,
            password: hashedPassword,
            phone: phone,
            role: role || "Admin",
            permissions: permissions || [],
            profileImage: profileImage
        });

        const newAdminAnalytics = await adminAnalyticsModel.create();
        const newActivityLog = await activityLogModel.create({
            userId: newAdmin._id,
            userType: "Admin",
            action: "registered",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Admin ${newAdmin.adminName} registered and logged in`
            }
        });

        newAdmin.activityLogs.push(newActivityLog._id);
        await newAdmin.save();

        //Backups
        createBackup("admins", newAdmin.adminName, "admin", newAdmin.toObject());
        createBackup("admins", newAdmin.adminName, "adminAnalytics", newAdminAnalytics.toObject());
        createBackup("admins", newAdmin.adminName, "activityLogs", newActivityLog.toObject());

        const token = newAdmin.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: `Admin ${newAdmin.adminName} registered successfully`,
            token: token,
            admin: {
                adminName: newAdmin.adminName,
                email: newAdmin.email,
                phone: newAdmin.phone,
                role: newAdmin.role,
                permissions: newAdmin.permissions,
                profileImage: newAdmin.profileImage
            }
        })
    }
    catch(err){
        console.log("Error in registerAdminController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const loginAdminController = async (req, res) => {
    try{
        const { email, password } = req.body;

        const admin = await adminModel.findOne({ email });
        if(!admin){
            return res.status(404).json({ success: false, message: "Invalid Credentials" });
        }

        const isPasswordCorrect = await admin.comparePassword(password);
        if(!isPasswordCorrect){
            return res.status(400).json({ success: false, message: "Email or password is incorrect" });
        }

        const token = admin.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        const newActivityLog = await activityLogModel.create({
            userId: admin._id,
            userType: "Admin",
            action: "login",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Admin ${admin.adminName} logged in`
            }
        });

        admin.activityLogs.push(newActivityLog._id);
        await admin.save();

        createBackup("admins", admin.adminName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: `Welcome back, ${admin.adminName}!`,
            token,
            admin: {
                id: admin._id,
                adminName: admin.adminName,
                email: admin.email,
                phone: admin.phone,
                role: admin.role,
                permissions: admin.permissions,
                profileImage: admin.profileImage
            }
        });
    }
    catch(err){
        console.log("Error in loginAdminController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const logoutAdminController = async (req, res) => {
    try{
        const adminId = req.user?._id;
        if(!adminId){
            return res.status(404).json({ success: false, message: "Unauthorized: Admin not logged in" });
        }

        const admin = await adminModel.findById(adminId);
        if(!admin){
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        res.clearCookie("jwt");

        const newActivityLog = await activityLogModel.create({
            userId: adminId,
            userType: "Admin",
            action: "logout",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Admin ${admin.adminName} logged out`
            }
        });

        admin.activityLogs.push(newActivityLog._id);
        await admin.save();

        createBackup("admins", admin.adminName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: "Successfully logged out" });
    }
    catch(err){
        console.log("Error in logoutAdminController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getAdminProfileController = async (req, res) => {
    try{
        const adminId = req.user?._id;
        const admin = await adminModel.findById(adminId).select("-password");
        if(!admin){
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        res.status(200).json({
            success: true,
            profile: admin
        })
    }
    catch(err){
        console.log("Error in getAdminProfileController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getRestaurantsController = async (req, res) => {
    try{
        const restaurants = await restaurantModel.find()
            .select("-password").populate("orders bankDetails restaurantAnalytics menu foodItems")
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            restaurantCount: restaurants.length,
            restaurants: restaurants
        });
    }
    catch(err){
        console.log("Error in getRestaurantsController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getRestaurantByIdController = async (req, res) => {
    try{
        const { id } = req.params;

        const restaurant = await restaurantModel.findById(id).select("-password");
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }
        let decryptedRestaurant = {
            ...restaurant.toObject(),
            licenseNumber: {
                fssai: restaurant.licenseNumber.fssai ? decrypt(restaurant.licenseNumber.fssai) : null,
                gst: restaurant.licenseNumber.gst ? decrypt(restaurant.licenseNumber.gst) : null,
            }
        };

        const restaurantBankDetails = await restaurantBankDetailsModel.findOne({ restaurant_id: id });
        let decryptedRestaurantBankDetails = {
            ...restaurantBankDetails.toObject(),
            accountNumber: restaurantBankDetails.accountNumber ? decrypt(restaurantBankDetails.accountNumber) : null,
            IFSC: restaurantBankDetails.IFSC ? decrypt(restaurantBankDetails.IFSC) : null,
            upi_id: restaurantBankDetails.upi_id ? decrypt(restaurantBankDetails.upi_id) : null,
        };

        res.status(200).json({
            success: true,
            restaurant: decryptedRestaurant,
            bankDetails: decryptedRestaurantBankDetails
        });
    }
    catch(err){
        console.log("Error in getRestaurantByIdController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const verifyRestaurantController = async (req, res) => {
    try{
        const { id } = req.params;
        console.log(req.body);
        const { isVerified } = req.body;

        const admin = await adminModel.findById(req.user?._id);

        const restaurant = await restaurantModel.findById(id);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        restaurant.isVerified = isVerified;
        await restaurant.save();

        const newActivityLog = await activityLogModel.create({
            userId: req.user?._id,
            userType: "Admin",
            action: isVerified ? "verify_restaurant" : "reject_restaurant",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName} has been ${isVerified ? "verified" : "rejected"} by admin`
            }
        });

        createBackup("admins", admin.adminName, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: `Restaurant ${restaurant.restaurantName} has been ${isVerified ? "verified" : "rejected"} successfully`
        })
    }
    catch(err){
        console.log("Error in verifyRestaurantController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getAllCustomersController = async (req, res) => {
    try{
        const customers = await customerModel.find().select("-password").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            customersCount: customers.length,
            customers: customers
        });
    }
    catch(err){
        console.log("Error in getAllCustomersController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getCustomerByIdController = async (req, res) => {
    try{
        const { id } = req.params;

        const customer = await customerModel.findById(id);
        if(!customer){
            return res.status(404).json({ success: false, message: "Customer not found" });
        }

        res.status(200).json({
            success: true,
            customer: customer
        });
    }
    catch(err){
        console.log("Error in getCustomerByIdController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getOrdersController = async (req, res) => {
    try{
        const orders = await orderModel.find().populate("customer_id restaurant_id");

        res.status(200).json({
            success: true,
            ordersCount: orders.length,
            orders: orders
        });
    }
    catch(err){
        console.log("Error in getOrdersController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}