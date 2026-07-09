/**
 * services/admin.services.js
 *
 * Uses multer-s3 — file is already in S3 when service runs.
 * file.key  → S3 object key
 * file.location → public S3 URL
 * No PutObjectCommand needed.
 */

const path      = require("path");
const fs = require("fs");

const scriptPath = path.resolve(
    __dirname,
    "../../../ai_backend/ml/build_features.py"
);

console.log("Script Path:", scriptPath);
console.log("Exists:", fs.existsSync(scriptPath));
const { spawn } = require("child_process");
const axios     = require("axios");
const dotenv    = require("dotenv");

dotenv.config();

const adminRepository = require("../repositories/admin.repository");
const storageService  = require("./storage.services");

const BUCKET  = process.env.AWS_BUCKET_NAME;
const ML_DIR = path.resolve(
    __dirname,
    "../../../ai_backend/ml"
);

// ─────────────────────────────────────────────────────────
//  Internal helpers
// ─────────────────────────────────────────────────────────

function runPythonScript(scriptPath, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn("python", [scriptPath, ...args]);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", d => {
            stdout += d.toString();
        });

        proc.stderr.on("data", d => {
            stderr += d.toString();
        });

        proc.on("error", err => {
            reject(err);
        });

        proc.on("close", code => {
            if (code !== 0) {
                reject(new Error(`Python exited ${code}: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function callPaperIngestService(signedUrl, examId, year) {
    try {
        const baseUrl = process.env.AI_SERVICE_URL;
        console.log(`calling FastAPI paper ingest at: ${baseUrl}`);
        console.log(`AI_BASE_URL: ${baseUrl}`);
        console.log(`[AdminService] Signed URL length: ${signedUrl.length}`);
        console.log(`[AdminService] Signed URL start: ${signedUrl.substring(0, 100)}`);

        const response = await axios.post(
            `${baseUrl}/api/ingest/paper`,
            JSON.stringify({ pdf_url: signedUrl, exam_id: examId, year }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key":    process.env.AI_API_KEY,
                },
                timeout: 600000,
            }
        );
        return response.data;
    } catch (err) {
        throw new Error(
            err.response?.data?.detail || err.message || "Paper ingest failed"
        );
    }
}

// ─────────────────────────────────────────────────────────
//  Resolve exam — shared by paper and syllabus services
// ─────────────────────────────────────────────────────────

async function resolveExam(examId, examName) {
    if (examId) {
        const exam = await adminRepository.findExamByIdRepository(examId);
        if (!exam) throw new Error("Exam not found");
        return exam;
    }

    if (!examName) throw new Error("Either exam_id or exam_name is required");

    const existing = await adminRepository.findExamByNameRepository(examName);
    if (existing) return existing;

    // Auto-create
    const created = await adminRepository.upsertExamRepository(examName, null);
    console.log(`[AdminService] Auto-created exam: "${examName}" → ${created.id}`);
    return created;
}

// ─────────────────────────────────────────────────────────
//  EXAM SERVICES
// ─────────────────────────────────────────────────────────

async function createExamService(name, description) {
    if (!name?.trim()) throw new Error("Exam name is required");
    return await adminRepository.upsertExamRepository(name, description);
}

async function getAllExamsService() {
    return await adminRepository.findAllExamsRepository();
}

// ─────────────────────────────────────────────────────────
//  PAPER UPLOAD SERVICE
//
//  multer-s3 already uploaded the file to S3.
//  file.key      → S3 object key  e.g. "papers/uuid.pdf"
//  file.location → public S3 URL
//  Just use file.key to generate a signed URL for FastAPI.
// ─────────────────────────────────────────────────────────

async function uploadPaperService(file, examId, examName, year) {
    if (!file) throw new Error("No file provided");
    if (!year) throw new Error("year is required");

    const yearInt = parseInt(year);
    if (isNaN(yearInt) || yearInt < 1990 || yearInt > 2100) {
        throw new Error("Invalid year — must be between 1990 and 2100");
    }

    // Resolve exam
    const exam           = await resolveExam(examId, examName);
    const resolvedExamId = exam.id;

    // File is already in S3 — get the key from multer-s3
    const s3Key  = file.key;
    const fileUrl = `s3://${BUCKET}/${s3Key}`;
    console.log(`[AdminService] Uploaded paper to S3: ${fileUrl}`);

    // Create question_papers record
    const paperId = await adminRepository.createPaperRepository(
        resolvedExamId, yearInt, fileUrl
    );

    // Generate signed URL for FastAPI to download
    const signedUrl = await storageService.generateSignedUrl(s3Key);
    console.log(`[AdminService] Generated signed URL for paper: ${signedUrl}`);

    // Fire and forget — FastAPI ingest pipeline
    callPaperIngestService(signedUrl, resolvedExamId, yearInt)
        .then(() => adminRepository.markPaperProcessedRepository(paperId, true))
        .catch(err => {
            console.error(`[AdminService] Paper ${paperId} ingest failed:`, err.message);
            adminRepository.markPaperProcessedRepository(paperId, false).catch(() => {});
        });

    return {
        paper_id:  paperId,
        exam_id:   resolvedExamId,
        exam_name: exam.name,
        year:      yearInt,
        message:   "Paper accepted. OCR and question mapping running in background.",
    };
}

// ─────────────────────────────────────────────────────────
//  REPROCESS PAPER SERVICE
// ─────────────────────────────────────────────────────────

async function reprocessPaperService(paperId) {
    const paper = await adminRepository.findPaperByIdRepository(paperId);
    if (!paper) throw new Error("Paper not found");

    const s3Key     = paper.file_url.replace(`s3://${BUCKET}/`, "");
    const signedUrl = await storageService.generateSignedUrl(s3Key);
    const result    = await callPaperIngestService(signedUrl, paper.exam_id, paper.year);

    await adminRepository.markPaperProcessedRepository(paperId, true);

    return { paper_id: paperId, exam_id: paper.exam_id, year: paper.year, ...result };
}

// ─────────────────────────────────────────────────────────
//  LIST PAPERS
// ─────────────────────────────────────────────────────────

async function getPapersService(examId) {
    return await adminRepository.findPapersRepository(examId || null);
}

// ─────────────────────────────────────────────────────────
//  WEIGHTAGE
// ─────────────────────────────────────────────────────────

async function getWeightageService(examId) {
    if (!examId) throw new Error("examId is required");
    return await adminRepository.findWeightageByExamRepository(examId);
}

// ─────────────────────────────────────────────────────────
//  ML TRAIN
// ─────────────────────────────────────────────────────────

async function trainModelService(examId) {
    if (!examId) throw new Error("exam_id is required");

    const exam = await adminRepository.findExamByIdRepository(examId);
    if (!exam) throw new Error("Exam not found");

    await runPythonScript(path.join(ML_DIR, "build_features.py"), ["--exam-id", examId]);

    const trainOutput = await runPythonScript(
        path.join(ML_DIR, "ml_predictor.py"),
        ["--exam-id", examId, "--exam-name", exam.name, "--train"]
    );

    let meta = {};
    try {
        const jsonLine = trainOutput.split("\n").find(l => l.trim().startsWith("{"));
        if (jsonLine) meta = JSON.parse(jsonLine);
    } catch (_) {}

    return { exam_id: examId, exam_name: exam.name, ...meta };
}

// ─────────────────────────────────────────────────────────
//  ML PREDICT
// ─────────────────────────────────────────────────────────

async function predictService(examId, predictYear) {
    if (!examId)      throw new Error("exam_id is required");
    if (!predictYear) throw new Error("predict_year is required");

    const year = parseInt(predictYear);
    if (isNaN(year))  throw new Error("predict_year must be a number");

    const exam = await adminRepository.findExamByIdRepository(examId);
    if (!exam) throw new Error("Exam not found");

    const predOutput = await runPythonScript(
        path.join(ML_DIR, "ml_predictor.py"),
        ["--exam-id", examId, "--predict-year", String(year), "--save-to-db"]
    );

    let predictions = [];
    try {
        const jsonStart = predOutput.indexOf("[");
        if (jsonStart !== -1) predictions = JSON.parse(predOutput.slice(jsonStart));
    } catch (_) {}

    return { exam_id: examId, exam_name: exam.name, predict_year: year, count: predictions.length, predictions };
}

// ─────────────────────────────────────────────────────────
//  GET PREDICTIONS
// ─────────────────────────────────────────────────────────

async function getPredictionsService(examId, year) {
    if (!examId) throw new Error("examId is required");
    if (!year)   throw new Error("year is required");
    return await adminRepository.findPredictionsByExamYearRepository(examId, year);
}

module.exports = {
    createExamService,
    getAllExamsService,
    uploadPaperService,
    reprocessPaperService,
    getPapersService,
    getWeightageService,
    trainModelService,
    predictService,
    getPredictionsService,
};