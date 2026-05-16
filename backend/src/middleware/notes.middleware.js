// middleware/multerConfig.js

const multer = require("multer");

//const storage = multer.memoryStorage();


const multerS3 = require("multer-s3");
const s3 = require("../config/s3");

/*const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF files allowed"));
    }

    cb(null, true);
  }
});
*/

const fileFilter = (req, file, cb) => {
  // Allow only PDFs
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,

    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req, file, cb) => {
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),

  fileFilter,

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

module.exports = {upload};