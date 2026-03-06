
const app=require("./src/app");
const dotenv=require("dotenv");
dotenv.config();
const connectDB=require("./src/db/db");

connectDB();
console.log("Running this server.js in folder:", __dirname);

app.listen(process.env.PORT,()=>{
   console.log(`Server is still running on port ${process.env.PORT}`);
  
});
