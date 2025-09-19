import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();

//Database Connectivity File
import connectToDB from './lib/connectToDB.js';

//Middlewares
import { sanitizeInput } from './middlewares/sanitizeInput.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

import restaurantRoutes from './routes/restaurant.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

//Security middlewares
// sanitizeInput(app);

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/restaurant', restaurantRoutes);

//Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    connectToDB();
    console.log(`Server is running on http://localhost:${PORT}`);
})