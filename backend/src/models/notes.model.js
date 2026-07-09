const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────
//  BLOCK SUB-SCHEMAS — all unchanged from original
// ─────────────────────────────────────────────────────────

const ConceptBlockSchema = new mongoose.Schema({
    type:        { type: String, default: "concept" },
    heading:     { type: String, required: true },
    explanation: { type: String, required: true },
}, { _id: false });

const KeyPointItemSchema = new mongoose.Schema({
    point: { type: String, required: true },
    note:  { type: String, required: true },
}, { _id: false });

const KeyPointsBlockSchema = new mongoose.Schema({
    type:    { type: String, default: "keypoints" },
    heading: { type: String, required: true },
    points:  { type: [KeyPointItemSchema], required: true },
}, { _id: false });

const FlowchartStepSchema = new mongoose.Schema({
    label:       { type: String, required: true },
    description: { type: String, default: null },
}, { _id: false });

const FlowchartBlockSchema = new mongoose.Schema({
    type:      { type: String, default: "flowchart" },
    heading:   { type: String, required: true },
    direction: { type: String, enum: ["horizontal", "vertical"], default: "vertical" },
    steps:     { type: [FlowchartStepSchema], required: true },
}, { _id: false });

const TableBlockSchema = new mongoose.Schema({
    type:    { type: String, default: "table" },
    heading: { type: String, required: true },
    headers: { type: [String], required: true },
    rows:    { type: [[String]], required: true },
}, { _id: false });

const MindmapNodeSchema = new mongoose.Schema({
    label:    { type: String, required: true },
    children: [{
        label:    { type: String, required: true },
        children: { type: Array, default: [] },
    }],
}, { _id: false });

const MindmapBlockSchema = new mongoose.Schema({
    type:     { type: String, default: "mindmap" },
    heading:  { type: String, required: true },
    root:     { type: String, required: true },
    branches: { type: [MindmapNodeSchema], required: true },
}, { _id: false });

const FormulaBlockSchema = new mongoose.Schema({
    type:    { type: String, default: "formula" },
    heading: { type: String, required: true },
    formula: { type: String, required: true },
    meaning: { type: String, required: true },
    example: { type: String, default: null },
}, { _id: false });

const CalloutBlockSchema = new mongoose.Schema({
    type:    { type: String, default: "callout" },
    variant: {
        type:    String,
        enum:    ["tip", "warning", "important", "exam_tip"],
        default: "important",
    },
    text: { type: String, required: true },
}, { _id: false });

const TopicSchema = new mongoose.Schema({
    topic:    { type: String, required: true },
    overview: { type: String, default: "" },
    blocks:   { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { _id: false });

// ─────────────────────────────────────────────────────────
//  WEIGHTAGE SNAPSHOT SUB-SCHEMA
//  Stored on the note at generation time so the UI
//  never needs to re-query Postgres for display.
// ─────────────────────────────────────────────────────────

const WeightageYearSchema = new mongoose.Schema({
    year:           { type: Number },
    question_count: { type: Number },
    total_marks:    { type: Number },
    weightage_pct:  { type: Number },
}, { _id: false });

const PredictionSnapshotSchema = new mongoose.Schema({
    predicted_q_count:   { type: Number },
    predicted_marks:     { type: Number },
    predicted_weightage: { type: Number },
    confidence_score:    { type: Number },
}, { _id: false });

// ─────────────────────────────────────────────────────────
//  MAIN NOTES SCHEMA
// ─────────────────────────────────────────────────────────

const notesSchema = new mongoose.Schema({

    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "user",
        required: true,
        index:    true,
    },

    // ── File metadata ─────────────────────────────────────
    OriginalFileName: { type: String, required: true },
    fileUrl:          { type: String, required: true },
    fileSize:         { type: Number, required: true },
    mimeType:         { type: String, required: true },

    // ── Mode ──────────────────────────────────────────────
    mode: {
        type:     String,
        enum:     ["Normal", "Exam"],
        default:  "Normal",
        required: true,
    },

    // ── Exam context (null for Normal mode) ───────────────
    // examId is the Postgres UUID stored as a plain string.
    // subject + chapter are embedded so getUserNotesService
    // can filter without any Postgres join.
    examId:  { type: String, default: null, index: true },
    subject: { type: String, default: null },
    chapter: { type: String, default: null },

    // Snapshot of weightage history at the time of note generation.
    // Lets the UI render the history chart without a Postgres call.
    weightageSnapshot: {
        type:    [WeightageYearSchema],
        default: [],
    },

    // ML prediction snapshot at time of generation.
    prediction: {
        type:    PredictionSnapshotSchema,
        default: null,
    },

    // ── AI-generated content ──────────────────────────────
    title:    { type: String, default: "" },
    overview: { type: String, default: null },

    topics: {
        type:    [TopicSchema],
        default: [],
    },

    blocks: {
        type:    [mongoose.Schema.Types.Mixed],
        default: [],
    },

    // Quick stats — shown as UI badges ("12 concepts · 3 flowcharts")
    blockSummary: {
        totalBlocks: { type: Number, default: 0 },
        concepts:    { type: Number, default: 0 },
        keypoints:   { type: Number, default: 0 },
        flowcharts:  { type: Number, default: 0 },
        tables:      { type: Number, default: 0 },
        mindmaps:    { type: Number, default: 0 },
        formulas:    { type: Number, default: 0 },
        callouts:    { type: Number, default: 0 },
    },

    // ── Processing state ──────────────────────────────────
    aiStatus: {
        type:    String,
        enum:    ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    aiError: { type: String, default: null },

    // ── Soft delete ───────────────────────────────────────
    isDeleted: { type: Boolean, default: false },

}, { timestamps: true });

// ─────────────────────────────────────────────────────────
//  INDEXES
// ─────────────────────────────────────────────────────────

notesSchema.index({ userId: 1, createdAt: -1 });
notesSchema.index({ userId: 1, isDeleted: 1 });
notesSchema.index({ userId: 1, mode: 1 });
notesSchema.index({ userId: 1, mode: 1, subject: 1 });   // exam mode filter
notesSchema.index({ userId: 1, mode: 1, chapter: 1 });   // exam mode filter

// ─────────────────────────────────────────────────────────
//  METHODS
// ─────────────────────────────────────────────────────────

notesSchema.methods.computeBlockSummary = function () {
    const counts = {
        totalBlocks: this.blocks.length,
        concepts:    0,
        keypoints:   0,
        flowcharts:  0,
        tables:      0,
        mindmaps:    0,
        formulas:    0,
        callouts:    0,
    };
    for (const block of this.blocks) {
        if (block.type === "concept")   counts.concepts++;
        if (block.type === "keypoints") counts.keypoints++;
        if (block.type === "flowchart") counts.flowcharts++;
        if (block.type === "table")     counts.tables++;
        if (block.type === "mindmap")   counts.mindmaps++;
        if (block.type === "formula")   counts.formulas++;
        if (block.type === "callout")   counts.callouts++;
    }
    this.blockSummary = counts;
};

const notesModel = mongoose.model("Notes", notesSchema);
module.exports = notesModel;