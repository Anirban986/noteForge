const user = require("../models/user.model");

async function findbyEmailandUsername(username,email){
    return await user.findOne({
        $or:[
            {username},
            {email}
        ]
})
}

async function createUser(userData){
    return await user.create(userData);
}

async function findUserById(id){
    return await user.findById(id).select("-password");
}

module.exports={
    findbyEmailandUsername,
    createUser,
    findUserById
}