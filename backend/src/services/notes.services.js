const notesRepository = require("../repositories/notes.repository");
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");
const metadataRepo = require("../repositories/metadata.repository");
const storageService = require("./storage.service");

const axios = require("axios");
const FormData = require("form-data");

async function uploadFileService(userId, file, mode, metadata) {
    if (!file) {
        throw new Error("File is required");
    }

    const User = await userRepository.findUserById(userId);

    if (!User) {
        throw new Error("User not found");
    }

    // Free plan check
    if (User.plan === "free") {
        const count = await notesRepository.countByuserIdrepository(userId);
        if (count >= 5) {
            throw new Error("Free plan allows only 5 uploads");
        }
    }

    // Premium check
    if (mode === "Exam" && User.plan !== "premium") {
        throw new Error("Exam mode is premium feature");
    }

    //   Saving file using storage service
    const fileUrl = await storageService.uploadFile(file, userId);

    //   Saving DB entry
    const note = await notesRepository.createFilesRepository({
        userId,
        OriginalFileName: file.originalname,
        fileUrl: fileUrl,   
        fileSize: file.size,
        mimeType: file.mimetype,
        mode: mode || "Normal",
        aiStatus: "pending"
    });

    // Metadata (premium)
    if (mode === "Exam") {
        await metadataRepo.createExamRepository({
            userId: userId,
            noteId: note._id,
            exam: metadata.exam,
            subject: metadata.subject,
            chapter: metadata.chapter
        });
    }

    //   Calling AI backend
    try {
        const formData = new FormData();
        formData.append("file", file.buffer, file.originalname);
        formData.append("mode", mode === "Exam" ? "premium" : "free");

        if (mode === "Exam") {
            formData.append("exam", metadata.exam);
            formData.append("subject", metadata.subject);
            formData.append("chapters", JSON.stringify([metadata.chapter]));
        }

        const aiResponse = await axios.post(
            "http://localhost:8000/generate-notes/",
            formData,
            { headers: formData.getHeaders() }
        );

        //   Saving AI result
        await notesRepository.updateNoteWithAI(note._id, {
            summary: aiResponse.data.notes,
            aiStatus: "completed"
        });

        const updatedNote=await notesRepository.findByIdrepository(note._id);

 
    } catch (err) {
        console.error("AI Error:", err.message);

        await notesRepository.markeAsFailed(note._id);
    }

    return updatedNote;
   
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