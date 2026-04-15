const metadata=require("../models/metadata.model");

async function createExamRepository(data){
    return await metadata.create(data)
}

const Metadata = require("../models/metadata.model");

async function findNotesByIdRepository(noteIds) {
    return await Metadata.find({
        noteId: { $in: noteIds }
    });
}

async function findByExamRepository(userId,exam,subject,chapter){

    const query = { userId };

    if(exam) query.exam = exam;
    if(subject) query.subject = subject;
    if(chapter) query.chapter = chapter;

    return await metadata.find(query);
}

module.exports={
    createExamRepository,
    findByExamRepository,
    findNotesByIdRepository
}