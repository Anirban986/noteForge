/**
 * middleware/admin.upload.middleware.js
 *
 * Separate multer-s3 middleware for admin uploads.
 * Stores files under:
 *   papers/   → question paper PDFs
 *   syllabi/  → syllabus PDFs
 *
 * Different from notes.middleware.js which stores under:
 *   notes/<userId>/
 *
 * req.file after this middleware:
 *   req.file.key       → S3 object key  e.g. "papers/uuid.pdf"
 *   req.file.location  → public S3 URL
 *   req.file.bucket    → bucket name
 *   req.file.mimetype  → "application/pdf"
 *   req.file.size      → file size in bytes
 */

const multer   = require("multer");
const multerS3 = require("multer-s3");
const crypto   = require("crypto");
const s3       = require("../config/s3");

const adminUpload = multer({

    storage: multerS3({
        s3,
        bucket:      process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,

        key: (req, file, cb) => {
            const uniqueId = crypto.randomUUID();

            // Route-based folder separation
            // req.path is the path after the router mount point
            const isSyllabus = req.path.includes("syllabus");
            const folder     = isSyllabus ? "syllabi" : "papers";

            cb(null, `${folder}/${uniqueId}.pdf`);
        },
    }),

    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"), false);
        }
        cb(null, true);
    },

    limits: {
        fileSize: 50 * 1024 * 1024,  // 50 MB
    },
});

module.exports = adminUpload;