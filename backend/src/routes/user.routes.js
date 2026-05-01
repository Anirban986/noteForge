const express=require("express");
const router=express.Router();
const userController=require("../controllers/user.controller");
const userMiddleware=require("../middleware/user.middleware");

// Public routes
router.post("/register",userController.registerUser);
router.post("/login",userController.loginUser);
router.post("/logout",userController.logoutUser);

// Protected routes (require authentication)
router.get("/profile",userMiddleware.userMiddleware,userController.userProfile);
router.post("/upgrade",userMiddleware.userMiddleware,userController.upgradePlanController);
router.get("/itsMe",userMiddleware.userMiddleware,userController.getCurrentUserController);

//email verification routes
router.post("/verify-code", userController.verifyCode);
router.post("/resend-code", userController.resendVerification);

//forgot password routes
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

//🔥🔥 For admin only 
 // MFA routes - Public during setup, then protected
router.post("/verify-mfa",userController.verifyMfaController);
router.post("/setup-mfa",userController.setupMfaController);
router.post("/reset-mfa", userController.resetMfaController);

//🔥🔥To protect dashboard data
router.get("/admin/dashboard",
    userMiddleware.userMiddleware,
    userMiddleware.adminMiddleware,
    (req, res) => {
    res.json({ message: "Admin data" });
    }
    )
module.exports=router;
