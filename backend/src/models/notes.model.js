const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────
//  BLOCK SUB-SCHEMAS
//  Matches the Pydantic block types in services/generator.py
//  Frontend switches on block.type to render the right component
// ─────────────────────────────────────────────────────────

const ConceptBlockSchema = new mongoose.Schema({
    type: { type: String, default: "concept" },
    heading: { type: String, required: true },
    explanation: { type: String, required: true },
}, { _id: false });

const KeyPointItemSchema = new mongoose.Schema({
    point: { type: String, required: true },
    note: { type: String, required: true },
}, { _id: false });

const KeyPointsBlockSchema = new mongoose.Schema({
    type: { type: String, default: "keypoints" },
    heading: { type: String, required: true },
    points: { type: [KeyPointItemSchema], required: true },
}, { _id: false });

const FlowchartStepSchema = new mongoose.Schema({
    label: { type: String, required: true },
    description: { type: String, default: null },
}, { _id: false });

const FlowchartBlockSchema = new mongoose.Schema({
    type: { type: String, default: "flowchart" },
    heading: { type: String, required: true },
    direction: { type: String, enum: ["horizontal", "vertical"], default: "vertical" },
    steps: { type: [FlowchartStepSchema], required: true },
}, { _id: false });

const TableBlockSchema = new mongoose.Schema({
    type: { type: String, default: "table" },
    heading: { type: String, required: true },
    headers: { type: [String], required: true },
    rows: { type: [[String]], required: true },
}, { _id: false });

const MindmapNodeSchema = new mongoose.Schema({
    label: { type: String, required: true },
    children: [{
        label: { type: String, required: true },
        children: { type: Array, default: [] }
    }]
}, { _id: false });

const MindmapBlockSchema = new mongoose.Schema({
    type: { type: String, default: "mindmap" },
    heading: { type: String, required: true },
    root: { type: String, required: true },
    branches: { type: [MindmapNodeSchema], required: true }
}, { _id: false });

const FormulaBlockSchema = new mongoose.Schema({
    type: { type: String, default: "formula" },
    heading: { type: String, required: true },
    formula: { type: String, required: true },
    meaning: { type: String, required: true },
    example: { type: String, default: null },  // required in exam mode
}, { _id: false });

const CalloutBlockSchema = new mongoose.Schema({
    type: { type: String, default: "callout" },
    variant: {
        type: String,
        enum: ["tip", "warning", "important", "exam_tip"],  // exam_tip for exam mode
        default: "important"
    },
    text: { type: String, required: true },
}, { _id: false });

const TopicSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    overview: { type: String, default: "" },

    blocks: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    }
}, { _id: false });



// ─────────────────────────────────────────────────────────
//  MAIN NOTES SCHEMA
// ─────────────────────────────────────────────────────────

const notesSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },


    OriginalFileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },


    mode: {
        type: String,
        enum: ["Normal", "Exam"],
        default: "Normal",
        required: true
    },

    title: {
        type: String,
        default: ""
    },

    // ── AI-generated Topper's Notes ───────────────────────

    // 2-3 sentence overview of the document
    overview: { type: String, default: null },

    topics: {
        type: [TopicSchema],
        default: []
    },

    // Ordered list of typed content blocks
    // Frontend switches on block.type to render the right component:
    //   concept   → heading card + 2-3 line explanation
    //   keypoints → pill/card list
    //   flowchart → visual flowchart with arrows
    //   table     → comparison table
    //   mindmap   → tree diagram
    //   formula   → formula card with meaning + example
    //   callout   → highlighted sticky-note (exam_tip variant for exam mode)
    blocks: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    // Quick stats — shown in UI as badges ("12 concepts · 3 flowcharts")
    blockSummary: {
        totalBlocks: { type: Number, default: 0 },
        concepts: { type: Number, default: 0 },
        keypoints: { type: Number, default: 0 },
        flowcharts: { type: Number, default: 0 },
        tables: { type: Number, default: 0 },
        mindmaps: { type: Number, default: 0 },
        formulas: { type: Number, default: 0 },
        callouts: { type: Number, default: 0 },
    },

    // ── Processing state ──────────────────────────────────
    aiStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    },
    aiError: { type: String, default: null },

    // ── Soft delete ───────────────────────────────────────
    isDeleted: { type: Boolean, default: false },

}, { timestamps: true });


// ── Indexes ───────────────────────────────────────────────
notesSchema.index({ userId: 1, createdAt: -1 });
notesSchema.index({ userId: 1, isDeleted: 1 });
notesSchema.index({ userId: 1, mode: 1 });                         // filter by mode
// filter by exam


// ── Helper: compute blockSummary from blocks array ────────
// Call this before saving when blocks are populated
notesSchema.methods.computeBlockSummary = function () {
    const counts = {
        totalBlocks: this.blocks.length,
        concepts: 0,
        keypoints: 0,
        flowcharts: 0,
        tables: 0,
        mindmaps: 0,
        formulas: 0,
        callouts: 0,
    };
    for (const block of this.blocks) {
        if (block.type === "concept") counts.concepts++;
        if (block.type === "keypoints") counts.keypoints++;
        if (block.type === "flowchart") counts.flowcharts++;
        if (block.type === "table") counts.tables++;
        if (block.type === "mindmap") counts.mindmaps++;
        if (block.type === "formula") counts.formulas++;
        if (block.type === "callout") counts.callouts++;
    }
    this.blockSummary = counts;
};


const notesModel = mongoose.model("Notes", notesSchema);
module.exports = notesModel;