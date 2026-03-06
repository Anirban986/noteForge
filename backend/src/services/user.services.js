const userRepository = require("../repositories/user.repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cookie = require("cookie-parser");
dotenv.config();


async function registerUserService(userData) {
    const { name, username, email, password } = userData;
    if (!name || !username || !email || !password) {
        throw new Error("All_fields_are_required");
    }
    const existingUser = await userRepository.findbyEmailandUsername(userData.username, userData.email);
    if (existingUser) {
        throw new Error("Username_or_email_already_exists");
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = await userRepository.createUser({
        name,
        username,
        email,
        password: hashedPassword
    })

    const token = jwt.sign({
        id: newUser._id,
    }, process.env.JWT_SECRET)
    return { newUser, token };
}

async function loginUserService(userData) {
    const { email, password } = userData;
    const user = await userRepository.findbyEmailandUsername(null, email);
    if (!user) {
        throw new Error("Invalid_email_or_password");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid_email_or_password");
    }
    const token = jwt.sign({
        id: user._id,
    }, process.env.JWT_SECRET)
    return { user, token };
}


async function userProfileService(userId) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error("User_not_found");
    }
    return user;
}

async function upgradePlanService(userId) {
        const user = await userRepository.findUserById(userId) ;

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.plan === "premium") {
    throw new Error("ALREADY_PREMIUM");
  }

  user.plan = "premium";
  user.planActivatedAt = new Date();

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  user.planExpiresAt = expiry;

  await user.save();

  return {
    plan: user.plan,
    expiresAt: user.planExpiresAt
  };
}

async function getCurrentUser(userId){
    const user= await userRepository.findUserById(userId);
    return user;
}

module.exports = {
    registerUserService,
    loginUserService,
    userProfileService,
    upgradePlanService,
    getCurrentUser   
}

