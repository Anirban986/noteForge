const notesRepository = require("../repositories/notes.repository");
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");

async function uploadFileService(userId, file, mode) {
    if (!file) {
        throw new error("File is required");
    }
    const User = await userRepository.findUserById(userId);

    if (!User) {
        throw new error("Not User");
    }

    // Enforce free plan limit
    if (user.plan === "free") {
        const count = await notesRepository.countByuserIdrepository(userId);

        if (count >= 5) {
            throw new Error("Free plan allows only 5 uploads");
        }
    }

    // Enforce premium for exam mode
    if (mode === "exam" && user.plan !== "premium") {
        throw new Error("Exam mode is premium feature");
    }

    const note=await notesRepository.createFilesRepository({
        userId,
        OriginalFileName: file.originalname,
        fileUrl: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        mode: mode || "normal"
    });

    return note;
} 

async function getUserNotesService(userId){
    return await notesRepository.findByuserIdrepository(userId);
}

async function deleteNoteService(noteId){
    return await notesRepository.deleteByidrepositorty(noteId);
}

module.exports={
    uploadFileService,
    getUserNotesService,
    deleteNoteService
}