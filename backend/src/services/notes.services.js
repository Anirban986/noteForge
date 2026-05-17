const notesRepository = require("../repositories/notes.repository");
const note=require("../models/notes.model")
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");
const metadataRepo = require("../repositories/metadata.repository");
const storageService = require("./storage.services");

const axios = require("axios");
const FormData = require("form-data");

/*async function callIngestService(file) {
    try {
        const formData = new FormData();

        formData.append("file", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        const response = await axios.post(
            "http://localhost:8000/ingest",
            formData,
            {
                headers: formData.getHeaders()
            }
        );

        return response.data;

    } catch (err) {
        throw new Error(
            err.response?.data?.detail || "Ingest failed"
        );
    }
}*/

async function callIngestService(pdfUrl) {

    try {

        const response = await axios.post(
            "http://localhost:8000/ingest",
            {
                pdf_url: pdfUrl
            }
        );

        return response.data;

    } catch (err) {

        throw new Error(
            err.response?.data?.detail ||
            "Ingest failed"
        );
    }
}

async function callAIService(mode, metadata, source) {
    try {
        if (mode === "Exam") {
            return await axios.post(
                "http://localhost:8000/notes/exam",
                {
                    source: source,
                    exam: metadata.exam,
                    subject: metadata.subject,
                    chapter: metadata.chapter,
                    topic: metadata?.topic || null
                }
            );
        } else {
            return await axios.post(
                "http://localhost:8000/notes",
                {
                    source: source,
                    topic: metadata?.topic || null
                }
            );
        }
    } catch (err) {
        throw new Error(
            err.response?.data?.detail || "AI service failed"
        );
    }
}

async function uploadFileService(
    userId,
    file,
    mode,
    metadata
) {

    // ─────────────────────────────────────
    // Validation
    // ─────────────────────────────────────

    if (!file) {
        throw new Error("File is required");
    }

    const User =
        await userRepository.findUserById(userId);

    if (!User) {
        throw new Error("User not found");
    }

    // Free plan limit
    if (User.plan === "free") {

        const count =
            await notesRepository.countByuserIdrepository(userId);

        if (count >= 5) {
            throw new Error(
                "Free plan allows only 5 uploads"
            );
        }
    }

    // Premium-only exam mode
    if (
        mode === "Exam" &&
        User.plan !== "premium"
    ) {
        throw new Error(
            "Exam mode is premium feature"
        );
    }

    // ─────────────────────────────────────
    // Upload file to S3
    // ─────────────────────────────────────

    const uploadResult =
        await storageService.uploadFile(
            file,
            userId
        );

    /*
        uploadResult should return:

        {
            fileUrl,
            key
        }
    */

    const { fileUrl, key } = uploadResult;

    // ─────────────────────────────────────
    // Create DB entry FIRST
    // ─────────────────────────────────────

    const note =
        await notesRepository.createFilesRepository({

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

    // ─────────────────────────────────────
    // Save exam metadata
    // ─────────────────────────────────────

    if (mode === "Exam") {

        await metadataRepo.createExamRepository({

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

    // ─────────────────────────────────────
    // Generate temporary signed URL
    // ─────────────────────────────────────

    const signedUrl =
        await storageService.generateSignedUrl(
            key
        );

    // ─────────────────────────────────────
    // Ingest PDF into AI pipeline
    // ─────────────────────────────────────

    const ingestResult =
        await callIngestService(
            signedUrl
        );

    const source =
        ingestResult.source;

    // ─────────────────────────────────────
    // Generate AI notes
    // ─────────────────────────────────────

    let updatedNote = null;

    try {

        const aiResponse =
            await callAIService(
                mode,
                metadata,
                source
            );

        const aiData =
            aiResponse.data;

        const title =
            aiData?.title ||
            "Untitled Note";

        const overview =
            aiData?.overview ||
            "";

        let topics =
            aiData?.topics || [];

        let allBlocks = [];

        // Proper topics format
        if (
            Array.isArray(topics) &&
            topics.length > 0
        ) {

            topics.forEach(topic => {

                if (
                    Array.isArray(topic.blocks)
                ) {
                    allBlocks.push(
                        ...topic.blocks
                    );
                }
            });
        }

        // Old fallback format
        else if (
            Array.isArray(aiData?.blocks) &&
            aiData.blocks.length > 0
        ) {

            topics = [
                {
                    topic: title,
                    blocks: aiData.blocks
                }
            ];

            allBlocks = [
                ...aiData.blocks
            ];
        }

        else {

            throw new Error(
                "Invalid AI response"
            );
        }

        // ─────────────────────────────────
        // Update note with AI output
        // ─────────────────────────────────

        await notesRepository.updateNoteWithAI(
            note._id,
            {
                title,
                overview,
                topics,
                blocks: allBlocks,
                aiStatus: "completed"
            }
        );

        updatedNote =
            await notesRepository.findByIdrepository(
                note._id
            );

    } catch (err) {

        console.error(
            "AI ERROR:",
            err.message
        );

        await notesRepository.markeAsFailed(
            note._id,
            err.message
        );

        updatedNote =
            await notesRepository.findByIdrepository(
                note._id
            );
    }

    return updatedNote || note;
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
    countDocumentsService
}