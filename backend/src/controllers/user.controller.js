const userService = require("../services/user.services");
const cookie=require("cookie-parser")


async function registerUser(req,res){
try{
    const result=await userService.registerUserService(req.body);
    res.cookie("token",result.token,{httpOnly:true});
    res.status(201).json({message:"User registered successfully",
        user:result.newUser});
}
catch(error){
  if(error.message==="All_fields_are_required"){
    res.status(400).json({error:"All fields are required"});
  }
    else if(error.message==="Username_or_email_already_exists"){    
        res.status(409).json({message:"Username or email already exists",
            error
        });
    }
}
}

async function loginUser(req,res){
    try{
        const result=await userService.loginUserService(req.body);
        res.cookie("token",result.token,{httpOnly:true});
        res.status(200).json({message:"User logged in successfully",user:result.user});
    }
    catch(error){
        if(error.message==="Invalid_email_or_password"){
            res.status(401).json({error:"Invalid email or password"});
        }
        if(error.message==="All_fields_are_required"){
            res.status(400).json({error:"All fields are required"});
        }
        return res.status(500).json({ error: "Something went wrong" });
    }
}

async function logoutUser(req,res){
    res.clearCookie("token");
    res.status(200).json({message:"User logged out successfully"});
}


async function userProfile(req,res){
    try{
        const userId=req.user.id;
        console.log(req.user);
        const user=await userService.userProfileService(userId);
        res.status(200).json({user});
    }
    catch(error){
        if(error.message==="User_not_found"){
            res.status(404).json({error:"User not found"});
        }
    }
}

module.exports={
    registerUser,
    loginUser,
    logoutUser,
    userProfile
}