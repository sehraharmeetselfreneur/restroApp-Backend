import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const addressSchema = new mongoose.Schema({
    street: {
        type: String
    },

    city: {
        type: String
    },

    state: {
        type: String
    },

    pincode: {
        type: Number,
        minLength: 6
    },

    country: {
        type: String,
        default: "India"
    },

    landmark: {
        type: String
    },

    tag: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home"
    },

    geoLocation: {
        lat: { type: Number },
        lng: { type: Number }
    }
});

const paymentMethodSchema = new mongoose.Schema({
    type: {
        type: String,
        default: "UPI"
    },

    maskedDetails: {
        type: String
    },

    isDefault: {
        type: Boolean,
        default: true
    }
})

const customerSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        unique: true,
        sparse: true
    },

    phone: {
        type: String,
        unique: true,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        default: "Customer"
    },

    profileImage: {
        type: String
    },

    dob: {
        type: Date
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },

    address: [addressSchema],

    orders: [ { type: mongoose.Schema.Types.ObjectId, ref: "Orders" } ],

    paymentMethod: [paymentMethodSchema],

    loyaltyPoints: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LoyaltyPoints"
    },

    notifications :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notifications"
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ["active", "blocked"],
        default: "active"
    }
}, { timestamps: true });

customerSchema.statics.hashPassword = async function(password){
    return await bcrypt.hash(password, 12);
}

customerSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

customerSchema.methods.generateAuthToken = function(){
    return jwt.sign({ _id: this._id, role: this.role }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" });
}

const customerModel = mongoose.model('Customers', customerSchema);

export default customerModel;