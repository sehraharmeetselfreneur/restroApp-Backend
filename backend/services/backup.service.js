import fs from 'fs';
import path from 'path';

const supportDir = path.join(process.cwd(), "support");

// Ensure support folder exists
if(!fs.existsSync(supportDir)){
    fs.mkdirSync(supportDir, { recursive: true });
}

export const createBackup = (entityType, entityName, fileName, data) => {
    try {
        // Create the entity type folder (customers/restaurants)
        const entityTypeDir = path.join(supportDir, entityType.toLowerCase());
        
        if (!fs.existsSync(entityTypeDir)) {
            fs.mkdirSync(entityTypeDir, { recursive: true });
        }

        // Create the specific entity folder (customerName/restaurantName)
        const safeEntityName = entityName.replace(/\s+/g, "_").toLowerCase();
        const entityDir = path.join(entityTypeDir, safeEntityName);

        if (!fs.existsSync(entityDir)) {
            fs.mkdirSync(entityDir, { recursive: true });
        }

        const filePath = path.join(entityDir, `${fileName}.json`);
        let existingData = [];

        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            try {
                existingData = JSON.parse(fileContent);
                if (!Array.isArray(existingData)) {
                    existingData = [existingData]; // if old data was not array
                }
            } catch {
                existingData = []; // reset if corrupted
            }
        }

        existingData.push(data);    // Ensure new data is added as entry
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf-8");

        console.log(`Backup appended: ${filePath}`);
    } catch (err) {
        console.log(
            `Backup failed for ${entityType} ${entityName} - ${fileName}: `,
            err.message
        );
    }
};