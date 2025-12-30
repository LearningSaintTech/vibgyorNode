const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ensure folder exists
const uploadPath = "uploads/admin";
if (!fs.existsSync(uploadPath)) {
   fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, uploadPath);
   },
   filename: (req, file, cb) => {
      const uniqueName =
         Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
   }
});

const upload = multer({
   storage,
   limits: { fileSize: 5 * 1024 * 1024 },
   fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
         return cb(new Error("Only image files allowed"));
      }
      cb(null, true);
   }
});

module.exports = upload;
