const userRepository = require("../repositories/user.repository");


async function premiumMiddleware(req, res, next) {

    try {
        const userId = req.user.id;
        const user = await userRepository.findUserById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        if (user.plan !== "premium") {
            return res.status(403).json({
                message: "You have to be premium"
            })
        }

        next();
    } catch (error) {
        return res.status(500).json({
            message: err.message
        });
    }


}

module.exports = { premiumMiddleware };