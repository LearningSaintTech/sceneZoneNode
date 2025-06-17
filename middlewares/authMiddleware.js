const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) {
        return res
          .status(401)
          .json({ message: "Access denied. No token provided." });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("decoded", decoded);

      // Check if user roles match any allowed role
      const userRoles = Array.isArray(decoded.role)
        ? decoded.role
        : [decoded.role];

      const hasAccess = allowedRoles.some((role) => userRoles.includes(role));
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "Forbidden. Insufficient role." });
      }

      req.user = decoded;
      next();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
};

module.exports = { authMiddleware };
