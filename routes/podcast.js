const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer");
const Category = require("../models/category");
const User = require("../models/user");
const Podcast = require("../models/podcast");

const router = express.Router();

// Add a new podcast
router.post("/add-podcast", authMiddleware, upload, async (req, res) => {
    try {
        const { title, description, category } = req.body;

        // Check if files are present
        const frontImage = req.files["frontImage"] ? req.files["frontImage"][0].path : null;
        const audioFile = req.files["audioFile"] ? req.files["audioFile"][0].path : null;

        // Validate input fields
        if (!title || !description || !category || !frontImage || !audioFile) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const { user } = req; // Ensure user is populated by authMiddleware
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const cat = await Category.findOne({ categoryName: category });
        if (!cat) {
            return res.status(400).json({ message: "No category found" });
        }

        const catid = cat._id;
        const userid = user._id;

        // Check if a podcast with the same title already exists
        const existingPodcast = await Podcast.findOne({ title });
        if (existingPodcast) {
            return res.status(400).json({ message: "A podcast with this title already exists." });
        }

        const newPodcast = new Podcast({ title, description, category: catid, frontImage, audioFile, user: userid });

        // Save the podcast and update category and user
        await newPodcast.save();
        await Category.findByIdAndUpdate(catid, { $push: { podcasts: newPodcast._id } });
        await User.findByIdAndUpdate(userid, { $push: { podcasts: newPodcast._id } });

        res.status(201).json({ message: "Podcast added successfully" });
    } catch (error) {
        console.error("Error adding podcast:", error.message);
        return res.status(500).json({ message: "Failed to add podcast" });
    }
});

// Get all podcasts
router.get("/get-podcasts", async (req, res) => {
    try {
        const podcasts = await Podcast.find()
            .populate("category")
            .sort({ createdAt: -1 });
        res.status(200).json({ data: podcasts });
    } catch (error) {
        console.error("Error fetching podcasts:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user-specific podcasts
router.get("/get-user-podcasts", authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const userid = user._id;
        const data = await User.findById(userid)
            .populate({
                path: "podcasts",
                populate: { path: "category" },
            })
            .select("-password");

        if (data && data.podcasts) {
            data.podcasts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        res.status(200).json({ data: data.podcasts });
    } catch (error) {
        console.error("Error fetching user podcasts:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get a podcast by ID
router.get("/get-podcast/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const podcast = await Podcast.findById(id).populate("category");

        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }

        res.status(200).json({ data: podcast });
    } catch (error) {
        console.error("Error fetching podcast:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get podcasts by category
router.get("/category/:cat", async (req, res) => {
    try {
        const { cat } = req.params;
        const categories = await Category.find({ categoryName: cat }).populate({
            path: "podcasts",
            populate: { path: "category" },
        });

        let podcasts = [];
        categories.forEach((category) => {
            podcasts = [...podcasts, ...category.podcasts];
        });

        res.status(200).json({ data: podcasts });
    } catch (error) {
        console.error("Error fetching podcasts by category:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Edit a podcast
router.put("/edit-podcast/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        const { user } = req;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const podcast = await Podcast.findById(id);
        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }

        if (!podcast.user.equals(user._id)) {
            return res.status(403).json({ message: "You are not authorized to edit this podcast" });
        }

        podcast.title = title;
        podcast.description = description;
        await podcast.save();

        res.status(200).json(podcast);
    } catch (error) {
        console.error("Error editing podcast:", error.message);
        res.status(500).json({ message: "Failed to edit podcast" });
    }
});

// Delete a podcast
router.delete("/delete-podcast/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { user } = req;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const podcast = await Podcast.findById(id);
        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }

        if (!podcast.user.equals(user._id)) {
            return res.status(403).json({ message: "You are not authorized to delete this podcast" });
        }

        await Podcast.findByIdAndDelete(id);
        await Category.findByIdAndUpdate(podcast.category, { $pull: { podcasts: podcast._id } });
        await User.findByIdAndUpdate(user._id, { $pull: { podcasts: podcast._id } });

        res.status(200).json({ message: "Podcast deleted successfully" });
    } catch (error) {
        console.error("Error deleting podcast:", error.message);
        res.status(500).json({ message: "Failed to delete podcast" });
    }
});

module.exports = router;
