const notesRepository = require("../repositories/notes.repository");
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");
const metadataRepo = require("../repositories/metadata.repository")

async function uploadFileService(userId, file, mode, metadata) {
    if (!file) {
        throw new Error("File is required");
    }
    const User = await userRepository.findUserById(userId);

    if (!User) {
        throw new Error("User not found");
    }


    if (User.plan === "free") {
        const count = await notesRepository.countByuserIdrepository(userId);

        if (count >= 5) {
            throw new Error("Free plan allows only 5 uploads");
        }
    }


    if (mode === "Exam" && User.plan !== "premium") {
        throw new Error("Exam mode is premium feature");
    }

    const note = await notesRepository.createFilesRepository({
        userId,
        OriginalFileName: file.originalname,
        //fileUrl: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        mode: mode || "Normal"
    });

    if (mode === "Exam") {
        await metadataRepo.createExamRepository({
            userId: userId,
            noteId: note._id,
            exam: metadata.exam,
            subject: metadata.subject,
            chapter: metadata.chapter
        })
    }

    return note;
}

async function getUserNotesService(userId,filters) {
    if(!filters || Object.keys(filters).length===0){
        return await notesRepository.findByuserIdrepository(userId);
    }

     // Step 1: find metadata
     const metadata= await metadataRepo.findByExamRepository(
        userId,
        filters.exam,
        filters.subject,
        filters.chapter
     );

     const noteIds= metadata.map(m => m.noteId);
     // Step 3: fetch notes
     return await notesRepository.findNotesByIds(noteIds);
}

async function deleteNoteService(noteId) {
    return await notesRepository.deleteByidrepositorty(noteId);
}

module.exports = {
    uploadFileService,
    getUserNotesService,
    deleteNoteService
}