const notesService =
    require("../services/notes.services");

async function uploadNotesController(
    req,
    res,
    next
) {

    try {

        const note =
            await notesService.uploadFileService(

                req.user.id,

                req.file,

                req.body.mode,

                {
                    exam:
                        req.body.exam,

                    subject:
                        req.body.subject,

                    chapter:
                        req.body.chapter,

                    topic:
                        req.body.topic
                }
            );

        return res.status(201).json({

            success: true,

            message:
                "File uploaded successfully",

            note
        });

    } catch (err) {

        next(err);
    }
}


async function getNotesController(
    req,
    res,
    next
) {

    try {

        const filters = {

            mode:
                req.query.mode || "Normal",

            exam:
                req.query.exam,

            subject:
                req.query.subject,

            chapter:
                req.query.chapter
        };

        const notes =
            await notesService.getUserNotesService(

                req.user.id,

                filters
            );

        return res.status(200).json({

            success: true,

            notes
        });

    } catch (err) {

        next(err);
    }
}


async function deleteNotesController(
    req,
    res,
    next
) {

    try {

        const note =
            await notesService.deleteNoteService(

                req.params.id,

                req.user.id
            );

        return res.status(200).json({

            success: true,

            message:
                "Note deleted successfully",

            note
        });

    } catch (err) {

        next(err);
    }
}


async function countDocumentController(
    req,
    res,
    next
) {

    try {

        const counts =
            await notesService.countDocumentsService(
                req.user.id
            );

        return res.status(200).json({

            success: true,

            counts
        });

    } catch (err) {

        next(err);
    }
}

module.exports = {

    uploadNotesController,

    getNotesController,

    deleteNotesController,

    countDocumentController
};