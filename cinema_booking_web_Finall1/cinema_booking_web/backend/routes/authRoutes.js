const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController");
const { loginRateLimiter } = require("../middleware/securityMiddleware");
const { validateReq } = require("../middleware/validationMiddleware");
const { issueCsrfToken } = require("../middleware/csrfMiddleware");
const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 50 characters",
    "any.required": "Name is required",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string()
    .min(8)
    .pattern(
      new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$"),
    )
    .required()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must include uppercase, lowercase, number, and special character",
      "any.required": "Password is required",
    }),

  phone: Joi.string().optional().allow("").messages({
    "string.base": "Phone must be a valid text value",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

router.get("/csrf-token", issueCsrfToken);
router.post("/register", validateReq(registerSchema), registerUser);
router.post("/login", loginRateLimiter, validateReq(loginSchema), loginUser);

module.exports = router;
