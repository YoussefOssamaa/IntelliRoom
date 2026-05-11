import Room from '../../models/ecommerceModels/room.js';
import Product from '../../models/ecommerceModels/product.js';

export const getRoomsController = async (req, res) => {
    try {
        const query = req.query.active === 'true' ? { isActive: true } : {};
        const rooms = await Room.find(query).sort({ createdAt: 1 });
        
        res.status(200).json({ success: true, data: rooms });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const getRoomBySlugController = async (req, res) => {
    try {
        const room = await Room.findOne({ slug: req.params.slug });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        res.status(200).json({ success: true, data: room });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

// Fetch a single room by ID
export const getRoomByIdController = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("Error fetching room:", error);
    // If the ID is an invalid format, Mongoose throws a CastError
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: "Invalid Room ID" });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const postRoomController = async (req, res) => {
    try {
        const newRoom = new Room(req.body);
        await newRoom.save();
        
        res.status(201).json({ success: true, data: newRoom });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const putRoomController = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRoom = await Room.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });  

        if (!updatedRoom) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        
        res.status(200).json({ success: true, data: updatedRoom });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const deleteRoomController = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRoom = await Room.findByIdAndDelete(id);

        if (!deletedRoom) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        
        return res.status(200).json({ success: true, message: "Room deleted successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const getRoomProductsController = async (req, res) => {
    try {
        // 1. Get the slug from the URL (e.g., 'living-room')
        const { slug } = req.params;

        // 2. Find the Room to get its unique ObjectId
        const room = await Room.findOne({ slug: slug });
        
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        // 3. Find all products that have this Room's ID in their categorization array
        const products = await Product.find({ 
            "categorization.rooms": room._id 
        })
        .populate('categorization.primary', 'name slug') // Good practice so the frontend has category names
        .populate('categorization.subCategory', 'name slug');

        res.status(200).json({ success: true, data: products });

    } catch (err) {
        // 🚀 This console.error is critical for backend debugging!
        console.error("Crash in getRoomProductsController:", err); 
        return res.status(500).json({ success: false, message: err.message });
    }
}