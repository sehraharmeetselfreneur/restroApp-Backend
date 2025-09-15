import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

//Database Connectivity File
import connectToDB from './lib/connectToDB.js';

//Middlewares
import { sanitizeInput } from './middlewares/sanitizeInput.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

//Security middlewares
sanitizeInput(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


//Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    connectToDB();
    console.log(`Server is running on http://localhost:${PORT}`);
})