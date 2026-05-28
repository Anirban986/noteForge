const User = require("../models/user.model");

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findByUsername(username) {
  return User.findOne({ username });
}

/**
 * Accepts two separate args (username, email) so callers don't have to
 * guess which field to pass as the single "emailOrUsername" string.
 */
async function findByEmailOrUsername(username, email) {
  return User.findOne({
    $or: [{ email }, { username }],
  });
}

/** Canonical ID lookup used everywhere in services. */
async function findUserById(id) {
  return User.findById(id);
}

async function createUser(data) {
  return User.create(data);
}

/** Canonical update used everywhere in services. */
async function updateUser(id, update) {
  return User.findByIdAndUpdate(id, update, { new: true });
}

module.exports = {
  findByEmail,
  findByUsername,
  findByEmailOrUsername,
  findUserById,
  createUser,
  updateUser,
};