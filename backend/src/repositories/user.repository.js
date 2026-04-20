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
    console.log("🔍 Repository: Finding user by ID:", id);
    try {
        const User = await user.findById(id);
        console.log("✅ Repository: User found:", !!User);
        return User;
    } catch (error) {
        console.error("❌ Repository error:", error);
        throw error;
    }
}

module.exports={
    findbyEmailandUsername,
    createUser,
    findUserById
}