const {
    S3Client,
    GetObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const {
    getSignedUrl
} = require("@aws-sdk/s3-request-presigner");

const dotenv = require("dotenv");

dotenv.config();

const s3Client = new S3Client({

    region: process.env.AWS_REGION,

    credentials: {

        accessKeyId:
            process.env.AWS_ACCESS_KEY_ID,

        secretAccessKey:
            process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function generateSignedUrl(key) {

    const command =
        new GetObjectCommand({

            Bucket:
                process.env.AWS_BUCKET_NAME,

            Key: key
        });

    return await getSignedUrl(
        s3Client,
        command,
        {
            expiresIn: 3600
        }
    );
}

async function deleteFile(key) {

    const command =
        new DeleteObjectCommand({

            Bucket:
                process.env.AWS_BUCKET_NAME,

            Key: key
        });

    return await s3Client.send(command);
}

module.exports = {
    generateSignedUrl,
    deleteFile
};