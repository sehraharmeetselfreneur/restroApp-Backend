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
            const restaurantName = req.body.restaurantName || "Unknown_restaurant";

            let folderType = "images";
            if(file.fieldname === "docs" || file.mimetype.includes("pdf")){
                folderType = "docs";
            }

            const uploadPath = path.join(rootDir, restaurantName, folderType);

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