const fs = require("fs");
const path = require("path");

async function uploadFile(file, userId) {
    const uploadDir = `uploads/${userId}`;

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${Date.now()}_${file.originalname}`);

    await fs.promises.writeFile(filePath, file.buffer);

    return filePath; //  return fileUrl
}

module.exports = { uploadFile };