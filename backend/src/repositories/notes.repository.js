const Notes = require("../models/notes.model");
const mongoose = require("mongoose");


async function createFilesRepository(data) {
    return await Notes.create(data);
}

async function countByuserIdrepository(userId) {
    return await Notes.countDocuments({
        userId,
        isDeleted: false
    })
}

async function findNotesByIds(noteIds) {
    return await Notes.find({
        _id: { $in: noteIds },
        isDeleted: false
    }).sort({ createdAt: -1 });
}


async function findWithQuery(query) {
  return await Notes.find(query).sort({ createdAt: -1 });
}

async function findByuserIdrepository(userId) {
    return await Notes.find({
        userId,
        isDeleted: false
    }).sort({ createdAt: -1 })
}

async function findByIdrepository(noteId) {
    return await Notes.findOne({
        _id: noteId,
        isDeleted: false
    });
}

async function deleteByidrepositorty(noteId) {
    return await Notes.findByIdAndUpdate(
        noteId,
        {
            isDeleted: true,
            updatedAt: Date.now()
        },
        { returnDocument: 'after' })
}



async function updateNoteWithAI(noteId, aiData) {
    try {
        const note = await Notes.findById(noteId);

        if (!note) {
            throw new Error("Note not found");
        }

        //  1. Validate blocks (flattened blocks)
        if (!Array.isArray(aiData.blocks) || aiData.blocks.length === 0) {
            throw new Error("Invalid AI data: blocks missing or empty");
        }

        //  2. Save title
        note.title = aiData.title || "Untitled Note";

        //  3. Save overview
        note.overview = aiData.overview || null;

        //  4. Save topics (VERY IMPORTANT)
        note.topics = (aiData.topics || []).map((t, index) => ({
            topic: t.topic && t.topic.trim() !== ""
                ? t.topic
                : `Topic ${index + 1}`,   // ✅ fallback name
            blocks: Array.isArray(t.blocks) ? t.blocks : []
        }));

        //  5. Save flattened blocks
        note.blocks = aiData.blocks;

        //  6. Compute summary
        note.computeBlockSummary();

        //  7. Update status
        note.aiStatus = aiData.aiStatus || "completed";
        note.aiError = null;

        await note.save();

        return note;

    } catch (err) {
        console.error("Update AI Error:", err.message);

        await Notes.findByIdAndUpdate(noteId, {
            aiStatus: "failed",
            aiError: err.message,
            updatedAt: Date.now()
        });

        throw err;
    }
}

async function markeAsFailed(noteId, errorMessage = "AI processing failed") {
    return await Notes.findByIdAndUpdate(
        noteId,
        {
            aiStatus: "failed",
            aiError: errorMessage,
            updatedAt: Date.now()
        },
        { returnDocument: 'after' }
    );
}

async function countByUserIdWithModeRepository(userId) {
    console.log("REPO USER ID:", userId);

    const result = await Notes.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                isDeleted: false
            }
        },
        {
            $group: {
                _id: "$mode",
                count: { $sum: 1 }
            }
        }
    ]);

    console.log("AGG RESULT:", result);

    return result;
}

module.exports = {
    createFilesRepository,
    countByuserIdrepository,
    findByIdrepository,
    findByuserIdrepository,
    deleteByidrepositorty,
    findNotesByIds,
    updateNoteWithAI,
    markeAsFailed,
    findWithQuery,
    countByUserIdWithModeRepository
    
};