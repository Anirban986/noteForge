const jwt = require("jsonwebtoken");

async function userMiddleware(req, res, next) {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(401).json({
                message: "Not authorized - No token provided"
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
        
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Invalid token"
            });
        }
        
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token expired"
            });
        }
        
        console.error("Auth middleware error:", error);
        res.status(401).json({
            message: "Authentication failed"
        });
    }
}

// 🔥🔥🔥 For Admin only 🔥🔥🔥

async function adminMiddleware(req, res, next) {
    try {
        // Check if req.user exists (should be set by userMiddleware)
        if (!req.user) {
            return res.status(401).json({
                message: "Not authorized - User context missing"
            });
        }

        // Check if user has admin role
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied - Admin privileges required"
            });
        }
        
        next();
        
    } catch (error) {
        console.error("Admin middleware error:", error);
        res.status(500).json({
            message: "Server error in admin authorization"
        });
    }
}

module.exports = { 
    userMiddleware, 
    adminMiddleware 
};