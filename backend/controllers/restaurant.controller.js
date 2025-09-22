//Models used
import activityLogModel from "../models/activityLogs.model.js";
import restaurantModel from "../models/restaurant.model.js";
import restaurantBankDetailsModel from "../models/restaurant_bank_details.model.js";
import restaurantAnalyticsModel from "../models/restaurantAnalytics.model.js";

// Services used
import { createBackup } from "../services/backup.service.js";
import { decrypt, encrypt } from "../services/encryption.service.js";

export const registerRestaurantController = async (req, res) => {
    try{
        const {
            restaurantName,
            ownerName,
            email,
            phone,
            description,
            password,
            address,
            cuisines,
            licenseNumber,
            openingTime,
            closingTime,
            bankDetails
        } = req.body;

        const fssaiLicense = req.files?.fssaiLicense?.[0]?.path || null;
        const gstCertificate = req.files?.gstCertificate?.[0]?.path || null;
        const panCard = req.files?.panCard?.[0]?.path || null;
        const images = req.files?.images?.map(file => file.path) || [];

        let parsedAddress = {};
        if (address) {
            try {
                parsedAddress = JSON.parse(address);    
            }
            catch(err){
                return res.status(400).json({ success: false, message: "Invalid address format" });
            }
        }

        let parsedCuisines = {};
        if (cuisines) {
            try {
                parsedCuisines = JSON.parse(cuisines);    
            }
            catch(err){
                return res.status(400).json({ success: false, message: "Invalid cuisines format" });
            }
        }

        let parsedLicense = {};
        if (licenseNumber) {
            try {
                parsedLicense = JSON.parse(licenseNumber);
            } catch (err) {
                return res.status(400).json({ success: false, message: "Invalid license number format" });
            }
        }
        console.log(typeof parsedLicense.fssai);

        let parsedBankDetails = {};
        if (bankDetails) {
            try {
                parsedBankDetails = JSON.parse(bankDetails);    
            }
            catch(err){
                return res.status(400).json({ success: false, message: "Invalid bank details format" });
            }
        }

        const existingRestaurant = await restaurantModel.findOne({ $or: [{ email }, { phone }] });
        if(existingRestaurant){
            return res.status(400).json({ success: false, message: "Restaurant already registered" });
        }

        const hashedPassword = await restaurantModel.hashPassword(password);
        const newRestaurant = await restaurantModel.create({
            restaurantName: restaurantName,
            ownerName: ownerName,
            email: email,
            phone: phone,
            password: hashedPassword,
            description: description,
            address: parsedAddress,
            cuisines: parsedCuisines,
            openingTime: openingTime,
            closingTime: closingTime,
            licenseNumber: {
                fssai: parsedLicense.fssai ? encrypt(parsedLicense.fssai) : null,
                gst: parsedLicense.gst ? encrypt(parsedLicense.gst) : null
            },
            documents: {
                fssaiLicense: fssaiLicense,
                gstCertificate: gstCertificate,
                panCard: panCard
            },
            images: images
        });

        //RestaurantBankDetails document creation
        const newRestaurantBankDetails = await restaurantBankDetailsModel.create({
            restaurant_id: newRestaurant._id,
            accountHolderName: parsedBankDetails.accountHolderName,
            accountNumber: encrypt(parsedBankDetails.accountNumber),
            IFSC: encrypt(parsedBankDetails.IFSC),
            bankName: parsedBankDetails.bankName,
            upi_id: parsedBankDetails.upi_id ? encrypt(parsedBankDetails.upi_id) : null,
        });

        //RestaurantAnalytics document creation
        const newRestaurantAnalytics = await restaurantAnalyticsModel.create({ restaurantId: newRestaurant._id });

        //ActivityLog document creation
        const newActivityLog = await activityLogModel.create({
            userId: newRestaurant._id,
            userType: "Restaurant",
            action: "registered",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${newRestaurant.restaurantName} registered and logged in`
            }
        });

        //JWT token
        const token = newRestaurant.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });
        
        //Backups
        createBackup("restaurants", newRestaurant.restaurantName, "restaurant", newRestaurant.toObject());    //Backup for restaurantModel
        createBackup("restaurants", newRestaurant.restaurantName, "bankDetails", newRestaurantBankDetails.toObject());     //Backup for restaurantBankDetails
        createBackup("restaurants", newRestaurant.restaurantName, "restaurantAnalytics", newRestaurantAnalytics.toObject());   //Backup for restaurantAnalytics
        createBackup("restaurants", newRestaurant.restaurantName, "activityLogs", newActivityLog.toObject());    //Backup for activityLogsModel

        res.status(201).json({
            success: true,
            message: `Restaurant - ${newRestaurant.restaurantName} registered successfully`,
            token: token,
            restaurant: {
                id: newRestaurant._id,
                name: newRestaurant.restaurantName,
                email: newRestaurant.email,
                phone: newRestaurant.phone,
                address: newRestaurant.address,
                documents: newRestaurant.documents,
                images: newRestaurant.images,
            },
            restaurantBankDetails: {
                accountHolderName: newRestaurantBankDetails.accountHolderName,
                bankName: newRestaurantBankDetails.bankName,
                upi_id: newRestaurantBankDetails.upi_id,
                accountNumber: newRestaurantBankDetails.accountNumber,
                IFSC: newRestaurantBankDetails.IFSC
            },
            restaurantAnalytics: newRestaurantAnalytics.toObject()
        });
    }
    catch(err){
        console.log("Error in registerRestaurantController: ", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const loginRestaurantController = async (req, res) => {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({ success: false, message: "Email and password is required" });
        }

        const existingRestaurant = await restaurantModel.findOne({ email: email });
        if(!existingRestaurant){
            return res.status(404).json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordCorrect = await existingRestaurant.comparePassword(password);
        if(!isPasswordCorrect){
            return res.status(400).json({ success: false, message: "Email or password is incorrect" });
        }

        //JWT token creation
        const token = existingRestaurant.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        //activityLog document creation
        const newActivityLog = await activityLogModel.create({
            userId: existingRestaurant._id,
            userType: "Restaurant",
            action: "login",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${existingRestaurant.restaurantName} logged in with email, password and OTP`
            }
        });

        createBackup("restaurants", existingRestaurant.restaurantName, "activityLogs", newActivityLog.toObject());  //Backup for activityLogs Model

        res.status(200).json({
            success: true,
            message: `Restaurant - ${existingRestaurant.restaurantName} logged in successfully`,
            token,
            restaurant: {
              id: existingRestaurant._id,
              name: existingRestaurant.restaurantName,
              email: existingRestaurant.email,
              phone: existingRestaurant.phone,
              address: existingRestaurant.address,
              documents: existingRestaurant.documents,
              images: existingRestaurant.images,
            }
        })
    }
    catch(err){
        console.log("Error in loginRestaurantController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const logoutRestaurantController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const restaurant = await restaurantModel.findById(restaurantId);

        //Deleting jwt token from cookies
        res.clearCookie("jwt", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        //ActivityLog document creation
        const newActivityLog = await activityLogModel.create({
            userId: restaurantId,
            userType: "Restaurant",
            action: "logout",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} logged out`,
            },
        });

        createBackup("restaurants", restaurant.restaurantName, "activityLogs", newActivityLog.toObject());   //Backup for activityLogsModel

        res.status(200).json({ success: true, message: "Restaurant Logged out successfully" });
    }
    catch(err){
        console.log("Error in logoutRestaurantController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getRestaurantProfileController = async (req, res) => {
    try{
        //Restaurant details
        const restaurant = await restaurantModel.findById(req.user?._id).select("-password");
        const restaurantBankDetails = await restaurantBankDetailsModel.findOne({ restaurant_id: restaurant._id });
        const restaurantAnalytics = await restaurantAnalyticsModel.findOne({ restaurantId: restaurant._id });

        let decryptedRestaurant = null;
        if (restaurant) {
            decryptedRestaurant = {
                ...restaurant.toObject(),
                licenseNumber: {
                    fssai: restaurant.licenseNumber.fssai ? decrypt(restaurant.licenseNumber.fssai) : null,
                    gst: restaurant.licenseNumber.gst ? decrypt(restaurant.licenseNumber.gst) : null,
                }
            };
        }

        let decryptedRestaurantBankDetails = null;
        if (restaurantBankDetails) {
            decryptedRestaurantBankDetails = {
                ...restaurantBankDetails.toObject(),
                accountNumber: restaurantBankDetails.accountNumber ? decrypt(restaurantBankDetails.accountNumber) : null,
                IFSC: restaurantBankDetails.IFSC ? decrypt(restaurantBankDetails.IFSC) : null,
                upi_id: restaurantBankDetails.upi_id ? decrypt(restaurantBankDetails.upi_id) : null,
            };
        }


        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        res.status(200).json({
            success: true,
            profile: decryptedRestaurant,
            bankDetails: decryptedRestaurantBankDetails,
            analytics: restaurantAnalytics
        });
    }
    catch(err){
        console.log("Error in getRestaurantProfileController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}