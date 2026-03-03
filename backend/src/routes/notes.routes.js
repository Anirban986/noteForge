const express=require("express");
const router=express.Router();
const notesController=require("../controllers/notes.controllers");
const {upload}=require("../middleware/notes.middleware");
const userMiddleware=require("../middleware/user.middleware");

router.post("/upload",userMiddleware.userMiddleware,upload.single("file"),notesController.uploadNotesController);
router.get("/myNotes",userMiddleware.userMiddleware,notesController.getNotesController);
router.delete("/:id",userMiddleware.userMiddleware,notesController.deleteNotesController);

module.exports=router;