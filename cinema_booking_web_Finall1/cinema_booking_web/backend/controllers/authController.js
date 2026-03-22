const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone,
    });

    logger.info(`New user registered. User ID: ${user._id}, IP: ${req.ip}`);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    console.error("REGISTER ERROR FULL:", error);

    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: "Server error",
      debug: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      logger.warn(
        `Failed login attempt for non-existing account from IP: ${req.ip}`,
      );
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.isLocked) {
      logger.warn(
        `Locked account login attempt. User ID: ${user._id}, IP: ${req.ip}`,
      );
      return res.status(423).json({
        error:
          "Account is temporarily locked due to multiple failed login attempts. Try again later.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      logger.warn(`Failed login attempt. User ID: ${user._id}, IP: ${req.ip}`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await user.resetLoginAttempts();
    logger.info(
      `User logged in successfully. User ID: ${user._id}, IP: ${req.ip}`,
    );

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    console.error("LOGIN ERROR FULL:", error);

    return res.status(500).json({
      error: "Server error",
      debug: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
