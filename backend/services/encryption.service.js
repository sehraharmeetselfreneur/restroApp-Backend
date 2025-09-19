import crypto from 'crypto';

const algorithm = "aes-256-cbc";

export const encrypt = (text) => {
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    
    if(!secretKey){
        throw new Error("ENCRYPTION_SECRET_KEY is not defined in environment variables");
    }
    if(!text){
        throw new Error("Text to encrypt cannot be empty");
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");
    
    return `${iv.toString("hex")}:${encrypted}`;
}

export const decrypt = (encryptedText) => {
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    
    if(!secretKey){
        throw new Error("ENCRYPTION_SECRET_KEY is not defined in environment variables");
    }
    
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    
    return decrypted;
}