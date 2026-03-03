const jwt= require("jsonwebtoken");

async function userMiddleware(req,res,next){
    try{
        const token=req.cookies.token;
        if(!token){
            res.status(401).json({
                message:"Not Authorized"
            })
        }
        
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded;
        next();
    }
    catch(err){
        res.status(401).json({
            message:"Invalid or expired token"
        })
    }
}

module.exports={userMiddleware};