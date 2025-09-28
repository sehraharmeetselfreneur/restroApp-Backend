import restaurantModel from "../models/restaurant.model.js";

export const getNearByRestaurantsController = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }

        const maxDistance = radius ? parseInt(radius) : 5000; // in meters

        const restaurants = await restaurantModel.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: "distance", // this field will contain distance in meters
                    maxDistance: maxDistance,
                    spherical: true,
                    query: { isOpen: false } // filter on open restaurants
                }
            },
            { $limit: 20 },
            { $project: { password: 0 } } // exclude password
        ]);

        res.status(200).json({
            success: true,
            restaurantCount: restaurants.length,
            restaurants
        });
    } catch (err) {
        console.log("Error in getNearByRestaurantsController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};