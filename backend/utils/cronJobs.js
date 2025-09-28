import cron from 'node-cron';

import { sendOfferNotifications } from "../cron/notifications.cron.js";
import { generateDailyAdminReports } from "../cron/reports.cron.js";
import { updateTrendingRestaurants } from "../cron/trending.cron.js";

export const startCronJobs = () => {
    console.log("[Cron Jobs] Scheduler started.");

    // 1. Update trending restaurants every hour
    cron.schedule("0 * * * *", async () => {
        console.log("[Cron Jobs] Running trending restaurants update...");
        await updateTrendingRestaurants();
    });

    // 2. Send offer notifications every hour
    cron.schedule("5 * * * *", async () => { // 5 min past each hour
        console.log("[Cron Jobs] Running offer notifications...");
        await sendOfferNotifications();
    });

    // 3. Generate daily admin reports at midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("[Cron Jobs] Generating daily admin reports...");
        await generateDailyAdminReports();
    });
};