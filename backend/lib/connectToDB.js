import mongoose from "mongoose";

const connectToDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGOURI);
        console.log(`Connected to MongoDB with host: ${conn.connection.host}`);
    }
    catch(err){
        console.log("Error in connectToDB: ", err.message);
        throw err;
    }
}

export default connectToDB;