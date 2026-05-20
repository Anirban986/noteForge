const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const AI_BASE_URL = process.env.AI_SERVICE_URL;

const AI_API_KEY = process.env.AI_API_KEY;

const aiClient = axios.create({
  baseURL: AI_BASE_URL,

  timeout: 300000,

  headers: {
    "x-api-key": AI_API_KEY,
  },
});

async function callIngestService(pdfUrl, userId, noteId) {
  console.log("AI_BASE_URL:", AI_BASE_URL);

  try {
    const response = await aiClient.post(
      "/api/ingest",

      {
        pdf_url: pdfUrl,
        source: "notes",
      },
    );

    return response.data;
  } catch (err) {
    console.error("INGEST ERROR:", err.response?.data || err.message);

    throw new Error(
      JSON.stringify(
        err.response?.data?.detail || err.message || "Ingest failed",
      ),
    );
  }
}

async function callAIService(mode, metadata, source) {
  try {
    const endpoint = mode === "Exam" ? "/api/notes/exam" : "/api/notes";

    const payload =
      mode === "Exam"
        ? {
            source,
            exam: metadata.exam,
            subject: metadata.subject,
            chapter: metadata.chapter,
            topic: metadata?.topic || null,
          }
        : {
            source,
            topic: metadata?.topic || null,
          };

    const response = await aiClient.post(endpoint, payload);
    console.log("AI RESPONSE:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);

    throw new Error(
      JSON.stringify(
        err.response?.data?.detail || err.message || "AI generation failed",
      ),
    );
  }
}

module.exports = {
  callIngestService,
  callAIService,
};
