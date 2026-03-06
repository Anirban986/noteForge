const mongoose = require("mongoose");

const metadataSchema = new mongoose.Schema({

userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user",
    required:true,
    index:true
},

noteId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Notes",
    required:true,
    index:true
},

exam:{
    type:String,
    required:true
},

subject:{
    type:String,
    required:true
},

chapter:{
    type:String
},

tags:[String],

createdAt:{
    type:Date,
    default:Date.now
}

});

metadataSchema.index({exam:1,subject:1,chapter:1});

const Metadata = mongoose.model("Metadata",metadataSchema);
module.exports = Metadata;