import orderModel from "../models/orders.model.js";

export const generateDailyAdminReports = async () => {
    try {
        // Total counts
        const totalUsers = await customerModel.countDocuments({ status: "active" });
        const totalRestaurants = await restaurantModel.countDocuments({ isActive: true });
        const totalOrders = await orderModel.countDocuments({});
        
        // Total revenue
        const orders = await orderModel.find({});
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        // Daily Active Users (users with at least one order in last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dailyActiveUsers = await orderModel.distinct("Customer", { createdAt: { $gte: twentyFourHoursAgo } });

        // Monthly Active Users (users with at least one order in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyActiveUsers = await orderModel.distinct("Customer", { createdAt: { $gte: thirtyDaysAgo } });

        // Churn Rate (percentage of users who haven't ordered in last 30 days)
        const churnedUsersCount = totalUsers - monthlyActiveUsers.length;
        const churnRate = totalUsers > 0 ? (churnedUsersCount / totalUsers) * 100 : 0;

        // Upsert analytics document (create if not exists)
        await adminAnalyticsModel.findOneAndUpdate(
            {},
            {
                totalUsers,
                totalRestaurants,
                totalOrders,
                totalRevenue,
                dailyActiveUsers: dailyActiveUsers.length,
                monthlyActiveUsers: monthlyActiveUsers.length,
                churnRate
            },
            { upsert: true, new: true }
        );

        console.log("[Admin Analytics] Daily report generated successfully!");
    } catch (error) {
        console.error("Error generating daily admin report:", error.message);
    }
};