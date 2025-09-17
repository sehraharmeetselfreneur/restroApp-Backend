import crypto from 'crypto';

const algorithm = "aes-256-cbc";
const secretKey = process.env.ENCRYPTION_SECRET_KEY;
const iv = crypto.randomBytes(16);

export const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
}

export const decrypt = (encryptedText) => {
    const [ivHex, encrypted] = encryptedText.split(":");
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(ivHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    return decrypted;
}