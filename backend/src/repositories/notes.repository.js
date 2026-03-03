const Notes=require("../models/notes.model");

async function createFilesRepository(data){
  return await Notes.create(data);
}

async function countByuserIdrepository(userId){
    return await Notes.countDocuments({
      userId,
      isDeleted: false
    })
}

async function findByuserIdrepository(userId){
    return await Notes.find({
        userId,
        isDeleted:false
    }).sort({createdAt:-1})
}

async function findByIdrepository(noteId) {
    return await Notes.findById(noteId);
}

async function deleteByidrepositorty(noteId){
    return await Notes.findByIdAndUpdate(
        noteId, 
        {isDeleted:true},
         {new:true})
}

module.exports={createFilesRepository,
    countByuserIdrepository,
    findByIdrepository,
    findByuserIdrepository,
    deleteByidrepositorty
};