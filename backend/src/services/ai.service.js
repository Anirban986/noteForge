const axios  = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const AI_BASE_URL = process.env.AI_SERVICE_URL;
const AI_API_KEY  = process.env.AI_API_KEY;

const aiClient = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 300000,
    headers: { "x-api-key": AI_API_KEY },
});

// ─────────────────────────────────────────────────────────
//  callIngestService — unchanged
// ─────────────────────────────────────────────────────────

async function callIngestService(pdfUrl, userId, noteId) {
    console.log("[AI Service] Calling ingest:", AI_BASE_URL);

    try {
        const response = await aiClient.post("/api/ingest", {
            pdf_url: pdfUrl,
            source:  "notes",
        });
        return response.data;
    } catch (err) {
        console.error("[AI Service] Ingest error:", err.response?.data || err.message);
        throw new Error(
            JSON.stringify(err.response?.data?.detail || err.message || "Ingest failed")
        );
    }
}

// ─────────────────────────────────────────────────────────
//  callAIService
//
//  examContext parameter is new — only populated in Exam mode.
//  Shape: { history: [...], prediction: {...} | null }
//
//  The Python AI service receives weightage_history and
//  prediction so Gemini can generate exam-specific notes
//  prioritised by historical frequency and predicted weight.
//
//  Normal mode: examContext is undefined / {} — payload
//  is identical to the original, no breaking change.
// ─────────────────────────────────────────────────────────

async function callAIService(mode, metadata, source, examContext = {}) {
    try {
        const endpoint = mode === "Exam" ? "/api/notes/exam" : "/api/notes";

        const payload = mode === "Exam"
            ? {
                source,
                exam:    metadata.exam,
                subject: metadata.subject,
                chapter: metadata.chapter,
                topic:   metadata?.topic || null,
                // ── NEW: exam context injected into Gemini prompt ──
                weightage_history: examContext.history    || [],
                prediction:        examContext.prediction || null,
              }
            : {
                source,
                topic: metadata?.topic || null,
              };

        const response = await aiClient.post(endpoint, payload);
        console.log("[AI Service] Response received");
        return response.data;

    } catch (err) {
        console.error("[AI Service] Generation error:", err.response?.data || err.message);
        throw new Error(
            JSON.stringify(err.response?.data?.detail || err.message || "AI generation failed")
        );
    }
}

module.exports = { callIngestService, callAIService };