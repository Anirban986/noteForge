const notesRepository = require("../repositories/notes.repository");
const note=require("../models/notes.model")
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");
const metadataRepo = require("../repositories/metadata.repository");
const storageService = require("./storage.services");
const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");
const {
    callIngestService,
    callAIService
} = require("./ai.service");


async function uploadFileService(
    userId,
    file,
    mode,
    metadata
) {

    if (!file) {
        throw new Error("File is required");
    }

    const user =
        await userRepository.findUserById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (
        user.plan === "free"
    ) {

        const count =
            await notesRepository
                .countByuserIdrepository(userId);

        if (count >= 5) {

            throw new Error(
                "Free plan allows only 5 uploads"
            );
        }
    }

    if (
        mode === "Exam" &&
        user.plan !== "premium"
    ) {

        throw new Error(
            "Exam mode is premium feature"
        );
    }

    const fileUrl = file.location;

    const key = file.key;

    let note = null;

    try {

        note =
            await notesRepository
                .createFilesRepository({

                    userId,

                    OriginalFileName:
                        file.originalname,

                    fileUrl,

                    fileSize:
                        file.size,

                    mimeType:
                        file.mimetype,

                    mode:
                        mode || "Normal",

                    aiStatus:
                        "processing"
                });

        if (mode === "Exam") {

            await metadataRepo
                .createExamRepository({

                    userId,

                    noteId:
                        note._id,

                    exam:
                        metadata.exam,

                    subject:
                        metadata.subject,

                    chapter:
                        metadata.chapter
                });
        }

        const signedUrl =
            await storageService
                .generateSignedUrl(key);

        const ingestResult =
            await callIngestService(
                signedUrl,
                user._id.toString(),
                note._id.toString()
            );

        const aiData =
            await callAIService(
                mode,
                metadata,
                ingestResult.source
            );

        const title =
            aiData?.title ||
            "Untitled Note";

        const overview =
            aiData?.overview ||
            "";

        let topics =
            aiData?.topics || [];

        let blocks = [];

        if (
            Array.isArray(topics)
        ) {

            topics.forEach(topic => {

                if (
                    Array.isArray(topic.blocks)
                ) {

                    blocks.push(
                        ...topic.blocks
                    );
                }
            });
        }

        if (
            !blocks.length &&
            Array.isArray(aiData?.blocks)
        ) {

            topics = [
                {
                    topic: title,
                    blocks: aiData.blocks
                }
            ];

            blocks = aiData.blocks;
        }

        if (!blocks.length) {

            throw new Error(
                "Invalid AI response"
            );
        }

        await notesRepository
            .updateNoteWithAI(

                note._id,

                {
                    title,
                    overview,
                    topics,
                    blocks,
                    aiStatus: "completed"
                }
            );

        return await notesRepository
            .findByIdrepository(note._id);

    } catch (err) {

        console.error(
            "UPLOAD PIPELINE ERROR:",
            err.message
        );

        if (note?._id) {

            await notesRepository
                .markeAsFailed(
                    note._id,
                    err.message
                );
        }

        throw err;
    }
}





async function getUserNotesService(userId, filters) {

  const mode = filters.mode || "Normal";

  const query = {
    userId,
    isDeleted: false,
    mode: mode   // ✅ always filter by mode
  };

  console.log("FINAL QUERY:", query);

  // ─────────────────────────────
  // 🟢 NORMAL MODE (NO METADATA)
  // ─────────────────────────────
  if (mode === "Normal") {
    const notes = await notesRepository.findWithQuery(query);

    return notes.map(note => ({
      ...note.toObject(),
      subject: "General",
      chapter: note.title || "Untitled",
      exam: null
    }));
  }

  // ─────────────────────────────
  // 🔵 EXAM MODE (WITH METADATA)
  // ─────────────────────────────

  const hasMetadataFilters =
    filters.exam || filters.subject || filters.chapter;

  let notes = [];

  if (!hasMetadataFilters) {
    // fetch all exam notes
    notes = await notesRepository.findWithQuery(query);
  } else {
    const metadata = await metadataRepo.findByExamRepository(
      userId,
      filters.exam,
      filters.subject,
      filters.chapter
    );

    if (!metadata.length) return [];

    const noteIds = [...new Set(metadata.map(m => m.noteId.toString()))];

    notes = await notesRepository.findNotesByIds(noteIds);
  }

  // 🔗 Fetch metadata for enrichment
  const noteIds = notes.map(n => n._id);

  const metadataList = await metadataRepo.findNotesByIdRepository(noteIds);

  const metadataMap = {};
  metadataList.forEach(m => {
    metadataMap[m.noteId.toString()] = m;
  });

  // 🔗 Merge metadata
  const enrichedNotes = notes.map(note => {
    const meta = metadataMap[note._id.toString()];

    return {
      ...note.toObject(),
      subject: meta?.subject ?? "Unknown",
      chapter: meta?.chapter ?? "",
      exam: meta?.exam ?? null
    };
  });

  return enrichedNotes;
}



async function deleteNoteService(noteId) {
    return await notesRepository.deleteByidrepositorty(noteId);
}

async function countDocumentsService(userId){
   const result = await notesRepository.countByUserIdWithModeRepository(userId);

    console.log("SERVICE RESULT:", result);

    let counts = {
        normal: 0,
        exam: 0
    };

    result.forEach(item => {
        counts[item._id.toLowerCase()] = item.count;
    });

    return counts; 
}

module.exports = {
    uploadFileService,
    getUserNotesService,
    deleteNoteService,
    countDocumentsService,
    
}