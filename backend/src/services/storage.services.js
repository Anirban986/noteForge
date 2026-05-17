const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const dotenv=require("dotenv");
dotenv.config();

const {
    getSignedUrl
} = require("@aws-sdk/s3-request-presigner");


// ─────────────────────────────────────────
// S3 Client
// ─────────────────────────────────────────

const s3Client = new S3Client({

    region: process.env.AWS_REGION,

    credentials: {
        accessKeyId:
            process.env.AWS_ACCESS_KEY_ID,

        secretAccessKey:
            process.env.AWS_SECRET_ACCESS_KEY
    }
});


// ─────────────────────────────────────────
// Upload File
// ─────────────────────────────────────────

async function uploadFile(file, userId) {

    const key =
        `${userId}/${Date.now()}_${file.originalname}`;

    const command =
        new PutObjectCommand({

            Bucket:
                process.env.S3_BUCKET_NAME,

            Key:
                key,

            Body:
                file.buffer,

            ContentType:
                file.mimetype
        });

    await s3Client.send(command);

    const fileUrl =
        `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
        fileUrl,
        key
    };
}


// ─────────────────────────────────────────
// Generate Signed URL
// ─────────────────────────────────────────

async function generateSignedUrl(key) {

    const command =
        new GetObjectCommand({

            Bucket:
                process.env.S3_BUCKET_NAME,

            Key:
                key
        });

    return await getSignedUrl(
        s3Client,
        command,
        {
            expiresIn: 3600
        }
    );
}


// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

module.exports = {
    uploadFile,
    generateSignedUrl
};