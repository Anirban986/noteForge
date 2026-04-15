const notesRepository = require("../repositories/notes.repository");
const userRepository = require("../repositories/user.repository");
const user = require("../models/user.model");
const metadataRepo = require("../repositories/metadata.repository");
const storageService = require("./storage.services");

const axios = require("axios");
const FormData = require("form-data");

async function callIngestService(file) {
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

    // calling ingest service
    const ingestResult = await callIngestService(file);

    //  Extract source (document identifier)
    const source = ingestResult.source;

    console.log("STEP 1: creating note");

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

    console.log("STEP 2: note created:", note?._id);

    let updatedNote = null;
    //   Calling AI backend
    try {
        const aiResponse = await callAIService(mode, metadata, source);

        console.log("AI RESPONSE:", JSON.stringify(aiResponse.data, null, 2));

        const aiData = aiResponse.data;

        const aiBlocks = aiData?.blocks || [];
        const overview = aiData?.overview || null;
        const title = aiData?.title || "Untitled Note";

        console.log("AI RAW DATA:", JSON.stringify(aiData, null, 2));

        const topics = aiData?.topics || [];
        let allBlocks = [];

        //  CASE 1: Proper topics returned
        if (Array.isArray(topics) && topics.length > 0) {
            topics.forEach(topic => {
                if (Array.isArray(topic.blocks)) {
                    allBlocks.push(...topic.blocks);
                }
            });
        }

        //  CASE 2: LLM returned OLD format → fallback
        else if (Array.isArray(aiData?.blocks) && aiData.blocks.length > 0) {

            console.warn("⚠️ AI returned old block format, auto-wrapping into topic");

            topics = [
                {
                    title: title || "General",
                    blocks: aiData.blocks
                }
            ];

            allBlocks = [...aiData.blocks];
        }

        //  STILL invalid
        else {
            throw new Error("Invalid AI response: No topics or blocks generated");
        }
        await notesRepository.updateNoteWithAI(note._id, {
            title,
            overview: overview,
            topics,
            blocks: allBlocks,
            aiStatus: "completed"
        });

        updatedNote = await notesRepository.findByIdrepository(note._id);

    } catch (err) {
        console.error("AI Error:", err.message);

        await notesRepository.markeAsFailed(note._id, err.message);

        updatedNote = await notesRepository.findByIdrepository(note._id);
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