import notificationModel from "../models/notifications.model.js";

export const sendNotification = async (userId, userType, message, type = "system") => {
    try{
        const notification = await notificationModel.create({
            userId: userId,
            userType: userType,
            message: message,
            type: type,
            isRead: false
        });

        console.log(`Notification sent to ${userType} ${userId}: ${message}`);

        return notification;
    }
    catch(err){
        console.log("Error in sendNotification: ", err.message);
    }
}