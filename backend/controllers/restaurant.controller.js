//Models used
import restaurantModel from "../models/restaurant.model.js";
import restaurantBankDetailsModel from "../models/restaurant_bank_details.model.js";

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

        const newRestaurantBankDetails = await restaurantBankDetailsModel.create({
            restaurant_id: newRestaurant._id,
            accountHolderName: accountHolderName,
            accountNumber: encrypt(accountNumber),
            IFSC: encrypt(IFSC),
            bankName: bankName,
            upi_id: upi_id ? encrypt(upi_id) : null,
        });

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

        createBackup("restaurant", restaurantName, "registration.json", backupData);

        res.status(201).json({
            success: true,
            message: `Restaurant - ${newRestaurant.restaurantName} registered successfully`,
            restaurant: {
                id: newRestaurant._id,
                name: newRestaurant.restaurantName,
                email: newRestaurant.email,
                phone: newRestaurant.phone,
                address: newRestaurant.address,
                documents: newRestaurant.documents,
                images: newRestaurant.images,
            }
        });
    }
    catch(err){
        console.log("Error in registerRestaurantController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}