const Notes    = require("../models/notes.model");
const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────
//  All original functions — zero changes
// ─────────────────────────────────────────────────────────

async function createFilesRepository(data) {
    return await Notes.create(data);
}

async function countByuserIdrepository(userId) {
    return await Notes.countDocuments({ userId, isDeleted: false });
}

async function findNotesByIds(noteIds) {
    return await Notes.find({
        _id:       { $in: noteIds },
        isDeleted: false,
    }).sort({ createdAt: -1 });
}

async function findWithQuery(query) {
    return await Notes.find(query).sort({ createdAt: -1 });
}

async function findByuserIdrepository(userId) {
    return await Notes.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
}

async function findByIdrepository(noteId) {
    return await Notes.findOne({ _id: noteId, isDeleted: false });
}

async function deleteByidrepositorty(noteId) {
    return await Notes.findByIdAndUpdate(
        noteId,
        { isDeleted: true, updatedAt: Date.now() },
        { returnDocument: "after" }
    );
}

async function markeAsFailed(noteId, errorMessage = "AI processing failed") {
    return await Notes.findByIdAndUpdate(
        noteId,
        { aiStatus: "failed", aiError: errorMessage, updatedAt: Date.now() },
        { returnDocument: "after" }
    );
}

async function countByUserIdWithModeRepository(userId) {
    return await Notes.aggregate([
        {
            $match: {
                userId:    new mongoose.Types.ObjectId(userId),
                isDeleted: false,
            },
        },
        {
            $group: {
                _id:   "$mode",
                count: { $sum: 1 },
            },
        },
    ]);
}

// ─────────────────────────────────────────────────────────
//  updateNoteWithAI
//  Extended to also persist:
//    - weightageSnapshot  (history array from Postgres)
//    - prediction         (ML snapshot from Postgres)
//  Both are optional — if absent nothing breaks.
// ─────────────────────────────────────────────────────────

async function updateNoteWithAI(noteId, aiData) {
    try {
        const note = await Notes.findById(noteId);
        if (!note) throw new Error("Note not found");

        // Validate blocks
        if (!Array.isArray(aiData.blocks) || aiData.blocks.length === 0) {
            throw new Error("Invalid AI data: blocks missing or empty");
        }

        // Core AI output
        note.title    = aiData.title    || "Untitled Note";
        note.overview = aiData.overview || null;

        note.topics = (aiData.topics || []).map((t, index) => ({
            topic:  t.topic && t.topic.trim() !== "" ? t.topic : `Topic ${index + 1}`,
            blocks: Array.isArray(t.blocks) ? t.blocks : [],
        }));

        note.blocks = aiData.blocks;
        note.computeBlockSummary();
        note.aiStatus = aiData.aiStatus || "completed";
        note.aiError  = null;

        // ── NEW: exam context snapshot ────────────────────
        // Only written when present — Normal mode passes nothing
        // and these fields stay at their schema defaults ([] / null).
        if (Array.isArray(aiData.weightageSnapshot)) {
            note.weightageSnapshot = aiData.weightageSnapshot;
        }

        if (aiData.prediction && typeof aiData.prediction === "object") {
            note.prediction = aiData.prediction;
        }

        await note.save();
        return note;

    } catch (err) {
        console.error("[Repository] updateNoteWithAI error:", err.message);
        await Notes.findByIdAndUpdate(noteId, {
            aiStatus:  "failed",
            aiError:   err.message,
            updatedAt: Date.now(),
        });
        throw err;
    }
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
    countByUserIdWithModeRepository,
};