const mongoose = require("mongoose");



const notesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    OriginalFileName: {
        type: String,
        required: true
    },
    fileUrl:{
        type:String,
        required:true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        enum: ["Normal", "Exam"],
        default: "Normal"
    },
    summary: {
        type: String
    },
    aiStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const notesModel = mongoose.model("Notes", notesSchema);
module.exports = notesModel;