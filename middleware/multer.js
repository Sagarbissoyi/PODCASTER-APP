const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Set storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// File upload configuration
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg"];
        const allowedAudioTypes = ["audio/mpeg", "audio/wav"];
        if (
            (file.fieldname === "frontImage" && allowedImageTypes.includes(file.mimetype)) ||
            (file.fieldname === "audioFile" && allowedAudioTypes.includes(file.mimetype))
        ) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"));
        }
    },
}).fields([
    { name: "frontImage", maxCount: 1 },
    { name: "audioFile", maxCount: 1 },
]);

module.exports = upload;
