const  notesService  = require("../services/notes.services");

async function uploadNotesController(req, res) {
    try {
        const userId = req.user.id;
        const file = req.file;
        const {  mode, exam, subject, chapter } = req.body;
        const metadata = {
            exam,
            subject,
            chapter
        };
        const note = await notesService.uploadFileService(userId, file, mode,metadata);

        res.status(201).json({
            message: "File uploaded successfully",
            note
        });
    }catch(error){
        res.status(401).json({
            message:error.message
        })
    }
}

async function getNotesController(req,res){
    try{
        const userId= req.user.id;
         const filters = {
            exam: req.query.exam,
            subject: req.query.subject,
            chapter: req.query.chapter
        };
        const notes=await notesService.getUserNotesService(userId,filters);
        res.status(201).json(notes);
    }catch(err){
        res.status(500).status({
            message:err.message
                })
    }
}

async function deleteNotesController(req,res){
    try {
    const { id } = req.params;

    const note = await notesService. deleteNoteService(id);

    res.status(200).json({
      message: "Note deleted successfully",
      note
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports={
    uploadNotesController,
    getNotesController,
    deleteNotesController
}