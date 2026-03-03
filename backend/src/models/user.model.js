const mongoose=require("mongoose");
const dotenv=require("dotenv");
dotenv.config();

const userSchema=new mongoose.Schema({
    name:{type:String,required:true},
    username:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    plan:{type:String, enum: ["free", "premium"],default:"free"},
    paymentid:{type:String,default:""},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
},{timestamps:true});

const user=mongoose.model("user",userSchema);

module.exports=user;