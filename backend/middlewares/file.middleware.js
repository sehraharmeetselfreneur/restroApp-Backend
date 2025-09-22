import multer from "multer"
import fs from 'fs';
import path from "path";

const rootDir = path.join(process.cwd(), "KYC");

if(!fs.existsSync(rootDir)){
    fs.mkdirSync(rootDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try{
            const adminName = req.body.adminName;
            const restaurantName = req.body.restaurantName;
            const customerName = req.body.customerName;
            
            let entityType, entityName;
            
            if (restaurantName) {
                entityType = "restaurants";
                entityName = restaurantName;
            } else if (customerName) {
                entityType = "customers";
                entityName = customerName;
            } else if (adminName) {
                entityType = "admins";
                entityName = adminName;
            } else {
                return cb(new Error("Either restaurantName or customerName is required"));
            }

            let folderType = "images";
            if(file.fieldname === "docs" || file.mimetype.includes("pdf")){
                folderType = "docs";
            }

            // Create the full path: KYC/{entityType}/{entityName}/{folderType}
            const sanitizedEntityName = entityName.replace(/\s+/g, "_").toLowerCase();
            const uploadPath = path.join(rootDir, entityType, sanitizedEntityName, folderType);

            fs.mkdirSync(uploadPath, { recursive: true });

            cb(null, uploadPath);
        }
        catch(err){
            cb(err);
        }
    },

    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });