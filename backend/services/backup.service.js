import fs from 'fs';
import path from 'path';

const supportDir = path.join(process.cwd(), "support");

// Ensure support folder exists
if(!fs.existsSync(supportDir)){
    fs.mkdirSync(supportDir, { recursive: true });
}

export const createBackup = (entityType, entityName, fileName, data) => {
    try{
        const safeEntityName = `${entityType}_${entityName}`.replace(/\s+/g, "_").toLowerCase();
        const entityDir = path.join(supportDir, safeEntityName);

        if(!fs.existsSync(entityDir)){
            fs.mkdirSync(entityDir, { recursive: true });
        }

        const filePath = path.join(entityDir, `${fileName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
        console.log(`Backup created: ${filePath}`);
    }
    catch(err){
        console.log(`Backup failed for ${entityType} ${entityName} - ${fileName}: `, err.message);
    }
}