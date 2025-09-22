import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["Admin", "SuperAdmin"],
        default: "Admin"
    },

    adminName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true,
        minLength: 6
    },

    phone: {
        type: String,
        unique: true,
        required: true
    },

    profileImage: {
        type: String
    },

    permissions: [
        {
            type: String,
            enum: [
                "manage_restaurants",
                "manage_customers",
                "manage_orders",
                "manage_payments",
                "manage_coupons",
                "view_analytics",
                "handle_tickets"
            ]
        }
    ],

    activityLogs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ActivityLogs"
        }
    ],

    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

adminSchema.statics.hashPassword = async function(password){
    return await bcrypt.hash(password, 12);
}

adminSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

adminSchema.methods.generateAuthToken = function(){
    return jwt.sign({ _id: this._id, role: this.role }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" })
}

const adminModel = mongoose.model("Admin", adminSchema);

export default adminModel;