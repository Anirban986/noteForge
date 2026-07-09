/**
 * services/admin.syllabus.service.js
 *
 * Uses multer-s3 — file is already in S3 when service runs.
 * No PutObjectCommand needed.
 */

const axios   = require("axios");
const dotenv  = require("dotenv");

dotenv.config();

const syllabusRepository = require("../repositories/syllabus.repository");
const adminRepository    = require("../repositories/admin.repository");
const storageService     = require("./storage.services");

const BUCKET = process.env.AWS_BUCKET_NAME;

// ─────────────────────────────────────────────────────────
//  Internal: resolve exam from id or name
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

    const created = await adminRepository.upsertExamRepository(examName, null);
    console.log(`[SyllabusService] Auto-created exam: "${examName}" → ${created.id}`);
    return created;
}

// ─────────────────────────────────────────────────────────
//  Internal: call FastAPI syllabus ingest
// ─────────────────────────────────────────────────────────

async function callSyllabusIngestService(signedUrl, examId) {
    try {
        const baseUrl = process.env.AI_SERVICE_URL;
        console.log(`[SyllabusService] Calling FastAPI at: ${baseUrl}/api/ingest/syllabus`);

        const response = await axios.post(
            `${baseUrl}/api/ingest/syllabus`,
            JSON.stringify({ pdf_url: signedUrl, exam_id: examId }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key":    process.env.AI_API_KEY,
                },
                timeout: 300000,
            }
        );
        return response.data;
    } catch (err) {
        throw new Error(
            err.response?.data?.detail || err.message || "Syllabus ingest failed"
        );
    }
}

// ─────────────────────────────────────────────────────────
//  uploadSyllabusService
//
//  multer-s3 already uploaded the file to S3.
//  file.key → S3 object key e.g. "syllabi/uuid.pdf"
//  No PutObjectCommand needed.
// ─────────────────────────────────────────────────────────

async function uploadSyllabusService(file, examId, examName) {
    if (!file) throw new Error("No file provided");

    // Resolve exam
    const exam           = await resolveExam(examId, examName);
    const resolvedExamId = exam.id;

    // File is already in S3
    const s3Key  = file.key;
    const fileUrl = `s3://${BUCKET}/${s3Key}`;
    console.log(`[SyllabusService] Syllabus already in S3: ${fileUrl}`);

    // Upsert exam_syllabi record (parsed=false)
    await syllabusRepository.upsertSyllabusRepository(resolvedExamId, fileUrl, null);

    // Generate signed URL for FastAPI
    const signedUrl = await storageService.generateSignedUrl(s3Key);
    console.log(`[SyllabusService] Generated signed URL for syllabus`);

    // Call FastAPI synchronously — wait for result
    // Syllabus is 1-3 pages so this completes in ~15-30 seconds
    const result = await callSyllabusIngestService(signedUrl, resolvedExamId);

    // Mark as parsed
    await syllabusRepository.markSyllabusParsedRepository(resolvedExamId);

    console.log(
        `[SyllabusService] Done: ${result.subjects_created} subjects, ` +
        `${result.chapters_created} chapters`
    );

    return {
        exam_id:          resolvedExamId,
        exam_name:        exam.name,
        subjects_created: result.subjects_created || 0,
        chapters_created: result.chapters_created || 0,
        message:
            "Syllabus parsed. All future question papers for this exam " +
            "will use syllabus-grounded chapter mapping.",
    };
}

// ─────────────────────────────────────────────────────────
//  Read-only services — unchanged
// ─────────────────────────────────────────────────────────

async function getSyllabusStatusService(examId) {
    const syllabus = await syllabusRepository.findSyllabusByExamRepository(examId);
    const tree     = syllabus?.parsed
        ? await syllabusRepository.getSyllabusTreeRepository(examId)
        : [];

    return {
        has_syllabus:   !!syllabus,
        parsed:         syllabus?.parsed || false,
        uploaded_at:    syllabus?.created_at || null,
        subjects_count: tree.length,
        chapters_count: tree.reduce((sum, s) => sum + s.chapters.length, 0),
        syllabus_tree:  tree,
    };
}

async function getSyllabusTreeService(examId) {
    return await syllabusRepository.getSyllabusTreeRepository(examId);
}

async function getSyllabusSubjectsService(examId) {
    return await syllabusRepository.getSyllabusSubjectsRepository(examId);
}

async function getSyllabusChaptersService(subjectId) {
    return await syllabusRepository.getSyllabusChaptersRepository(subjectId);
}

module.exports = {
    uploadSyllabusService,
    getSyllabusStatusService,
    getSyllabusTreeService,
    getSyllabusSubjectsService,
    getSyllabusChaptersService,
};