//Models used
import activityLogModel from "../models/activityLogs.model.js";
import foodItemModel from "../models/foodItems.model.js";
import menuCategoryModel from "../models/menu_categories.model.js";
import orderModel from "../models/orders.model.js";
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

        const fssaiLicense = req.files?.fssaiLicense?.[0]?.path ? req.files.fssaiLicense[0].path.replace(/\\/g, "/").split("KYC/")[1]
            ? "/KYC/" + req.files.fssaiLicense[0].path.replace(/\\/g, "/").split("KYC/")[1]
            : null
          : null;

        const gstCertificate = req.files?.gstCertificate?.[0]?.path ? req.files.gstCertificate[0].path.replace(/\\/g, "/").split("KYC/")[1]
            ? "/KYC/" + req.files.gstCertificate[0].path.replace(/\\/g, "/").split("KYC/")[1]
            : null
          : null;

        const panCard = req.files?.panCard?.[0]?.path ? req.files.panCard[0].path.replace(/\\/g, "/").split("KYC/")[1]
            ? "/KYC/" + req.files.panCard[0].path.replace(/\\/g, "/").split("KYC/")[1]
            : null
          : null;

        const images = req.files?.images?.map(file => {
            const relativePath = file.path.split("KYC")[1]; 
            return `/KYC${relativePath.replace(/\\/g, "/")}`; 
        }) || [];

        const bannerImage = req.files?.bannerImage?.[0]?.path ? req.files.bannerImage[0].path.replace(/\\/g, "/").split("KYC/")[1]
            ? "/KYC/" + req.files.bannerImage[0].path.replace(/\\/g, "/").split("KYC/")[1]
            : null
          : null;

        let parsedAddress = {};
        if (address) {
            try {
                const addr = JSON.parse(address);
            
                // Ensure coordinates are valid
                if (!addr.geoLocation || !Array.isArray(addr.geoLocation.coordinates) || addr.geoLocation.coordinates.length !== 2) {
                    return res.status(400).json({ success: false, message: "Invalid geoLocation coordinates. Must be [longitude, latitude]" });
                }
            
                parsedAddress = {
                    street: addr.street,
                    city: addr.city,
                    state: addr.state,
                    pincode: addr.pincode,
                    geoLocation: {
                        type: "Point",
                        coordinates: [
                            Number(addr.geoLocation.coordinates[0]), // longitude
                            Number(addr.geoLocation.coordinates[1])  // latitude
                        ]
                    }
                };
            }
            catch (err) {
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
            menu: [],
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
            images: images,
            bannerImage: bannerImage
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

        newRestaurant.bankDetails = newRestaurantBankDetails._id;
        newRestaurant.restaurantAnalytics = newRestaurantAnalytics._id;
        await newRestaurant.save();

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
        if(!restaurantId){
            return res.status(404).json({ success: false, message: "Unauthorized: Admin not logged in" });
        }
        const restaurant = await restaurantModel.findById(restaurantId);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

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

        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());   //Backup for activityLogsModel

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
        const restaurant = await restaurantModel.findById(req.user?._id)
            .select("-password")
            .populate("orders")
            .populate({
                path: "foodItems",
                populate: {
                    path: "category_id",
                    model: "MenuCategory"
                }
            })
            .populate({
                path: "menu",
                populate: {
                    path: "items",
                    model: "FoodItems"
                }
            });
        const restaurantBankDetails = await restaurantBankDetailsModel.findOne({ restaurant_id: restaurant._id });
        const restaurantAnalytics = await restaurantAnalyticsModel.findOne({ restaurantId: restaurant._id });
        const orders = await orderModel
        .find({ restaurant_id: restaurant._id })
        .populate("customer_id")
        .populate({
            path: "items.foodItem",
            model: "FoodItems",
            populate: {
                path: "category_id", // optional: if you want the food category inside foodItem
                model: "MenuCategory"
            }
        })
        .sort({ createdAt: -1 });

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
            analytics: restaurantAnalytics,
            orders: orders
        });
    }
    catch(err){
        console.log("Error in getRestaurantProfileController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const addMenuCategoryController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        const { name, description } = req.body;

        if(!name){
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const restaurant = await restaurantModel.findById(restaurantId);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const existingCategory = await menuCategoryModel.findOne({ restaurant_id: restaurantId, name: name });
        if(existingCategory){
            return res.status(400).json({ success: false, message: "Menu category already exists" });
        }

        const newCategory = await menuCategoryModel.create({
            restaurant_id: restaurantId,
            name: name,
            description: description || ""
        });

        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "added_menu_category",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} added ${newCategory.name} Menu Category`,
            }
        });

        restaurant.menu.push(newCategory._id);
        await restaurant.save();

        createBackup("restaurants", restaurant.email, "menuCategory", newCategory.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(201).json({
            success: true,
            message: "Menu Category added successfully",
            category: newCategory
        })
    }
    catch(err){
        console.log("Error in addMenuCategoryController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const addFoodItemController = async (req, res) => {
    try{
        const restaurantId = req.user?._id;
        console.log(req.body);
        const {
            category_name,
            name,
            description,
            price,
            discount_price,
            isAvailable,
            preparationTime,
            isVeg,
            tags,
            variants
        } = req.body;

        const images = req.files?.images?.map(file => {
            const relativePath = file.path.split("KYC")[1]; 
            return `/KYC${relativePath.replace(/\\/g, "/")}`; 
        }) || [];

        if (!category_name || !name || !price) {
            return res.status(400).json({ success: false, message: "Category, name, and price are required" });
        }

        const menuCategory = await menuCategoryModel.findOne({ name: category_name });
        const restaurant =  await restaurantModel.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const newFoodItem = await foodItemModel.create({
            restaurant_id: restaurantId,
            category_id: menuCategory._id,
            name: name,
            description: description || "",
            images: images,
            price: price,
            discount_price: discount_price || null,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            preparationTime: preparationTime || 15,
            isVeg: isVeg !== undefined ? isVeg : true,
            tags: tags ? JSON.parse(tags) : [],
            variants: variants ? JSON.parse(variants) : []
        });

        restaurant.foodItems.push(newFoodItem._id);
        menuCategory.items.push(newFoodItem._id);
        await restaurant.save();
        await menuCategory.save();

        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "added_food_item",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} added ${newFoodItem.name} Food Item`,
            }
        });

        createBackup("restaurants", restaurant.email, "foodItems", newFoodItem.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(201).json({
            success: true,
            message: "Food Item added successfully",
            foodItem: newFoodItem
        });
    }
    catch(err){
        console.log("Error in addFoodItemController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const deleteFoodItemController = async (req, res) => {
    try{
        const { id } = req.params;
        const restaurantId = req.user?._id;

        const deletedFoodItem = await foodItemModel.findByIdAndDelete(id);
        const restaurant = await restaurantModel.findById(restaurantId);
        const newActivityLog = await activityLogModel.create({
            userId: restaurantId,
            userType: "Restaurant",
            action: "deleted_food_item",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} deleted ${deletedFoodItem.name} Food Item`,
            }
        });

        createBackup("restaurants", restaurant.email, "restaurant", restaurant.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: `Food item ${deletedFoodItem.name} deleted successfully!`,
            deletedFoodItem: deletedFoodItem
        });
    }
    catch(err){
        console.log("Error in deleteFoodItemController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateFoodItemController = async (req, res) => {
    try{
        const { id } = req.params;
        const restaurantId = req.user?._id;
        console.log(req.body);

        const {
            category_name,
            name,
            description,
            price,
            discount_price,
            isAvailable,
            preparationTime,
            isVeg,
            tags,
            variants
        } = req.body;

        if (!category_name || !name || !price) {
            return res.status(400).json({ success: false, message: "Category, name, and price are required" });
        }

        const restaurant = await restaurantModel.findById(restaurantId);
        if (!category_name || !name || !price) {
            return res.status(400).json({ success: false, message: "Category, name, and price are required" });
        }

        const foodItem = await foodItemModel.findById(id);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const menuCategory = await menuCategoryModel.findOne({ name: category_name });
        if (!menuCategory) {
            return res.status(404).json({ success: false, message: "Menu category not found" });
        }

        const images = req.files?.images?.map(file => {
            const relativePath = file.path.split("KYC")[1]; 
            return `/KYC${relativePath.replace(/\\/g, "/")}`; 
        }) || foodItem.images;

        foodItem.category_id = menuCategory._id;
        foodItem.name = name;
        foodItem.description = description || "";
        foodItem.price = price;
        foodItem.discount_price = discount_price || null;
        foodItem.isAvailable = isAvailable !== undefined ? isAvailable : foodItem.isAvailable;
        foodItem.preparationTime = preparationTime || foodItem.preparationTime;
        foodItem.isVeg = isVeg !== undefined ? isVeg : foodItem.isVeg;
        foodItem.tags = tags ? JSON.parse(tags) : foodItem.tags;
        foodItem.variants = variants ? JSON.parse(variants) : foodItem.variants;
        foodItem.images = images;
        await foodItem.save();

        const newActivityLog = await activityLogModel.create({
            userId: restaurant._id,
            userType: "Restaurant",
            action: "updated_food_item",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} updated ${foodItem.name} Food Item`,
            }
        });

        createBackup("restaurants", restaurant.email, "foodItems", foodItem.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({
            success: true,
            message: `${foodItem.name} updated successfully`,
            foodItem: foodItem
        });
    }
    catch(err){
        console.log("Error in updateFoodItemController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateRestaurantAvailabilityController = async (req, res) => {
    try{
        const userId = req.user?._id;
        const restaurant = await restaurantModel.findById(userId);
        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        restaurant.isOpen = !restaurant.isOpen;
        await restaurant.save();

        const newActivityLog = await activityLogModel.create({
            userId: userId,
            userType: "Restaurant",
            action : restaurant.isOpen ? "restaurant_opened" : "restaurant_closed",
            metadata: {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
                message: `Restaurant ${restaurant.restaurantName || "Unknown"} ${restaurant.isOpen ? "closed" : "closed"}`
            }
        });

        createBackup("restaurants", restaurant.email, "restaurant", restaurant.toObject());
        createBackup("restaurants", restaurant.email, "activityLogs", newActivityLog.toObject());

        res.status(200).json({ success: true, message: `You're ${restaurant.isOpen ? "Opened" : "Closed"} now` });
    }
    catch(err){
        console.log("Error in updateRestaurantAvailabilityController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}