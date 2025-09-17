//Models used
import activityLogModel from "../models/activityLogs.model.js";
import restaurantModel from "../models/restaurant.model.js";
import restaurantBankDetailsModel from "../models/restaurant_bank_details.model.js";
import restaurantAnalyticsModel from "../models/restaurantAnalytics.model.js";

// Services used
import { createBackup } from "../services/backup.service.js";
import { encrypt } from "../services/encryption.service.js";

export const registerRestaurantController = async (req, res) => {
    try{
        const {
            restaurantName,
            email,
            phone,
            password,
            address,
            licenseNumber,
            accountHolderName,
            accountNumber,
            IFSC,
            bankName,
            upi_id
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

        let parsedLicense = {};
        if (licenseNumber) {
            try {
                parsedLicense = typeof licenseNumber === "string" ? JSON.parse(licenseNumber) : licenseNumber;
            } catch (err) {
                return res.status(400).json({ success: false, message: "Invalid license number format" });
            }
        }

        const existingRestaurant = await restaurantModel.findOne({ $or: [{ email }, { phone }] });
        if(existingRestaurant){
            return res.status(400).json({ success: false, message: "Restaurant already registered" });
        }

        const hashedPassword = await restaurantModel.hashPassword(password);
        const newRestaurant = await restaurantModel.create({
            restaurantName: restaurantName,
            email: email,
            phone: phone,
            password: hashedPassword,
            address: parsedAddress,
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
            accountHolderName: accountHolderName,
            accountNumber: encrypt(accountNumber),
            IFSC: encrypt(IFSC),
            bankName: bankName,
            upi_id: upi_id ? encrypt(upi_id) : null,
        });

        //RestaurantAnalytics document creation
        const newRestaurantAnalytics = await restaurantAnalyticsModel.create({ restaurantId: newRestaurant._id });

        //JWT token
        const token = newRestaurant.generateAuthToken();
        res.cookie("jwt", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.MODE === "production",
            maxAge: 24 * 60 * 60 * 1000
        });

        //ActivityLog document creation
        const newActivityLog = await activityLogModel.create({
            userId: newRestaurant._id,
            userType: "Restaurant",
            action: "login",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${newRestaurant.restaurantName} registered and logged in`
            }
        });

        //ActivityLogs backup
        const activityBackup = {
            id: newActivityLog._id,
            userId: newActivityLog.userId,
            userType: newActivityLog.userType,
            action: newActivityLog.action,
            metadata: newActivityLog.metadata,
            createdAt: newActivityLog.createdAt,
        };

        //New Restaurant backup
        const backupData = {
            restaurant: {
                id: newRestaurant._id,
                restaurantName: newRestaurant.restaurantName,
                email: newRestaurant.email,
                phone: newRestaurant.phone,
                address: newRestaurant.address,
                documents: {
                    fssaiLicense: newRestaurant.documents.fssaiLicense,
                    gstCertificate: newRestaurant.documents.gstCertificate,
                    panCard: newRestaurant.documents.panCard
                },
                images: images
            },

            bankDetails: {
                accountHolderName: newRestaurantBankDetails.accountHolderName,
                bankName: newRestaurantBankDetails.bankName,
                upi_id: newRestaurantBankDetails.upi_id,
                accountNumber: newRestaurantBankDetails.accountNumber,
                IFSC: newRestaurantBankDetails.IFSC
            }
        };
        
        createBackup("restaurant", newRestaurant.restaurantName, "restaurant", backupData);    //Backup for restaurantModel
        createBackup("restaurant", newRestaurant.restaurantName, "restaurantAnalytics", newRestaurantAnalytics.toObject());   //Backup for restaurantAnalytics
        createBackup("restaurant", newRestaurant.restaurantName, "activityLogs", activityBackup);    //Backup for activityLogsModel

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
            restaurantAnalytics: newRestaurantAnalytics
        });
    }
    catch(err){
        console.log("Error in registerRestaurantController: ", err.message);
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
            return res.status(404).json({ success: false, message: "Restaurant not found" });
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

        //activityLog backup
        const activityBackup = {
            id: newActivityLog._id,
            userId: newActivityLog.userId,
            userType: newActivityLog.userType,
            action: newActivityLog.action,
            metadata: newActivityLog.metadata,
            createdAt: newActivityLog.createdAt,
        };

        createBackup("restaurant", existingRestaurant.restaurantName, "activityLogs", activityBackup);  //Backup for activityLogs Model

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