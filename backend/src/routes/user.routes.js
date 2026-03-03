const express=require("express");
const router=express.Router();
const userController=require("../controllers/user.controller");
const userMiddleware=require("../middleware/user.middleware");

router.post("/register",userController.registerUser);
router.post("/login",userController.loginUser);
router.post("/logout",userController.logoutUser);
router.get("/profile",userMiddleware.userMiddleware,userController.userProfile);

module.exports=router;
