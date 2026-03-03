throw new Error("THIS SERVER FILE IS BEING USED");
const app=require("./src/app");
const dotenv=require("dotenv");
dotenv.config();
const connectDB=require("./src/db/db");

connectDB();


app.listen(process.env.PORT,()=>{
   // console.log(`Server running on port ${process.env.PORT}`);
   console.log("🔥 THIS IS NOTE FORGE BACKEND 🔥");
});
