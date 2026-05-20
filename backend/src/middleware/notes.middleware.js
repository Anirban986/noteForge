const multer = require("multer");
const multerS3 = require("multer-s3");
const crypto = require("crypto");

const s3 = require("../config/s3");

const fileFilter = (req, file, cb) => {

    if (file.mimetype !== "application/pdf") {

        return cb(
            new Error("Only PDF files are allowed"),
            false
        );
    }

    cb(null, true);
};

const upload = multer({

    storage: multerS3({

        s3,

        bucket: process.env.AWS_BUCKET_NAME,

        contentType:
            multerS3.AUTO_CONTENT_TYPE,

        key: (req, file, cb) => {

            const uniqueName =
                `${crypto.randomUUID()}.pdf`;

            const key =
                `notes/${req.user.id}/${uniqueName}`;

            cb(null, key);
        }
    }),

    fileFilter,

    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

module.exports = upload;