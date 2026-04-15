const express=require("express");
const router=express.Router();
const notesController=require("../controllers/notes.controllers");
const {upload}=require("../middleware/notes.middleware");
const userMiddleware=require("../middleware/user.middleware");
const premiumMiddleware= require("../middleware/premium.middleware");


router.post("/upload",userMiddleware.userMiddleware,upload.single("file"),notesController.uploadNotesController);
router.get("/myNotes",userMiddleware.userMiddleware,notesController.getNotesController);
router.delete("/:id",userMiddleware.userMiddleware,notesController.deleteNotesController);

//for premium users

router.post("/premium/upload",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    upload.single("file"),
    notesController.uploadNotesController
);

router.get("/premium/myNotes",
    userMiddleware.userMiddleware,
    premiumMiddleware.premiumMiddleware,
    notesController.getNotesController
);

router.get("/countDocs",
    userMiddleware.userMiddleware,
    notesController.countDocumentController
)

module.exports=router;