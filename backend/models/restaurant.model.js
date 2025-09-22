import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

const addressSchema = new mongoose.Schema({
    street: {
        type: String,
        required: true
    },

    city: {
        type: String,
        required: true
    },

    state: {
        type: String,
        required: true
    },

    pincode: {
        type: String,
        required: true
    },

    geoLocation: {
      lat: { type: Number },
      lng: { type: Number },
    }
});

const documentSchema = new mongoose.Schema({
    fssaiLicense: { type: String },
    gstCertificate: { type: String },
    panCard: { type: String },
});

const restaurantSchema = new mongoose.Schema({
    restaurantName: {
        type: String,
        required: true,
        trim: true
    },

    ownerName: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    cuisines: [{ type: String }],

    role: {
        type: String,
        default: "Restaurant"
    },

    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    phone: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true,
        minLength: 6
    },

    address: addressSchema,

    licenseNumber: {
        fssai: { type: String, required: true },
        gst: { type: String },
    },

    documents: documentSchema,

    closingTime: {
        type: String
    },

    openingTime: {
        type: String
    },

    isOpen: {
        type: Boolean,
        default: false
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    images: [{ type: String }]
}, { timestamps: true } );

restaurantSchema.statics.hashPassword = async function(password){
    return await bcrypt.hash(password, 12);
}

restaurantSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

restaurantSchema.methods.generateAuthToken = function(){
    return jwt.sign({ _id: this._id, role: this.role }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" });
}

const restaurantModel = mongoose.model('Restaurants', restaurantSchema);

export default restaurantModel;