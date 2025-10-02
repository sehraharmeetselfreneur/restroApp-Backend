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
                    query: { isOpen: true } // filter on open restaurants
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

export const getParticularRestaurantController = async (req, res) => {
    try{
        const { id } = req.params;
        const { lat, lng } = req.query;

        const restaurant = await restaurantModel.findById(id).select("-password")
            .populate("orders menu offers reviews")
            .populate({
                path: "menu",
                populate: {
                    path: "items"
                }
            })
            .populate({
                path: "foodItems",
                populate: {
                    path: "category_id",
                    select: "name"
                }
            });

        if(!restaurant){
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        let distance = null;
        if (lat && lng && restaurant.address.geoLocation?.coordinates) {
          const [restLng, restLat] = restaurant.address.geoLocation.coordinates;

          // Haversine formula in km
          const toRad = (deg) => (deg * Math.PI) / 180;
          const R = 6371; // Earth radius in km
          const dLat = toRad(restLat - parseFloat(lat));
          const dLng = toRad(restLng - parseFloat(lng));
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(parseFloat(lat))) *
              Math.cos(toRad(restLat)) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c; // in km
        }

        res.status(200).json({ success: true, data: { ...restaurant.toObject(), distance } });
    }
    catch(err){
        console.log("Error in getParticularRestaurantController: ", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}