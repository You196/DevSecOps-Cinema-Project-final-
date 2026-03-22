import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { sanitizeText, sanitizeToken, sanitizeUser } from "../utils/security";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const getPasswordChecks = (password) => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  };

  const getPasswordStrength = (password) => {
    const checks = getPasswordChecks(password);
    const passed = Object.values(checks).filter(Boolean).length;

    if (!password) return { label: "", color: "" };
    if (passed <= 2) return { label: "Weak", color: "#ff4d4f" };
    if (passed <= 4) return { label: "Medium", color: "#faad14" };
    return { label: "Strong", color: "#52c41a" };
  };

  const passwordChecks = getPasswordChecks(formData.password);
  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isPasswordField = name === "password" || name === "confirmPassword";
    const safeValue = isPasswordField ? value : sanitizeText(value);
    setFormData({ ...formData, [name]: safeValue });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const allChecksPassed = Object.values(passwordChecks).every(Boolean);
      if (!allChecksPassed) {
        setError("Password does not meet security requirements");
        return;
      }
    }

    try {
      setLoading(true);

      const payload = isLogin
        ? {
            email: sanitizeText(formData.email),
            password: formData.password,
          }
        : {
            name: sanitizeText(formData.name),
            email: sanitizeText(formData.email),
            password: formData.password,
          };

      const url = isLogin ? "/auth/login" : "/auth/register";
      const res = await apiClient.post(url, payload);

      if (res.data.token) {
        localStorage.setItem("token", sanitizeToken(res.data.token));
        localStorage.setItem(
          "user",
          JSON.stringify(sanitizeUser(res.data) || {})
        );
      }

      setSuccess(isLogin ? "Login successful" : "Account created successfully");

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (err) {
      const backendMessage =
        err.response?.data?.details?.join(", ") ||
        err.response?.data?.error ||
        "Server error";

      setError(sanitizeText(backendMessage, "Server error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "28px",
          padding: "36px",
          color: "#fff",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#ff4d5a",
            fontSize: "58px",
            fontWeight: "800",
            marginBottom: "12px",
            letterSpacing: "1px",
          }}
        >
          ROYALE
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#bfbfbf",
            fontSize: "18px",
            marginBottom: "30px",
          }}
        >
          {isLogin ? "Sign in to your premium account" : "Create your premium account"}
        </p>

        {error && (
          <p style={{ color: "#ff5a4f", textAlign: "center", marginBottom: "18px" }}>
            {error}
          </p>
        )}

        {success && (
          <p style={{ color: "#52c41a", textAlign: "center", marginBottom: "18px" }}>
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          {!isLogin && (
            <>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={inputStyle}
              />

              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "18px",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "#ddd",
                  lineHeight: "1.8",
                }}
              >
                <p style={{ color: passwordStrength.color, fontWeight: "700", marginBottom: "6px" }}>
                  Password Strength: {passwordStrength.label || "—"}
                </p>

                <div style={{ color: passwordChecks.minLength ? "#52c41a" : "#ff4d4f" }}>
                  • At least 8 characters
                </div>
                <div style={{ color: passwordChecks.hasUpper ? "#52c41a" : "#ff4d4f" }}>
                  • At least 1 uppercase letter
                </div>
                <div style={{ color: passwordChecks.hasLower ? "#52c41a" : "#ff4d4f" }}>
                  • At least 1 lowercase letter
                </div>
                <div style={{ color: passwordChecks.hasNumber ? "#52c41a" : "#ff4d4f" }}>
                  • At least 1 number
                </div>
                <div style={{ color: passwordChecks.hasSpecial ? "#52c41a" : "#ff4d4f" }}>
                  • At least 1 special character
                </div>

                {formData.confirmPassword && (
                  <div
                    style={{
                      color:
                        formData.password === formData.confirmPassword ? "#52c41a" : "#ff4d4f",
                      fontWeight: "700",
                      marginTop: "6px",
                    }}
                  >
                    {formData.password === formData.confirmPassword
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </div>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Please wait..." : isLogin ? "SIGN IN" : "CREATE ACCOUNT →"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#bfbfbf",
            marginTop: "26px",
            fontSize: "16px",
          }}
        >
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
              setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
              });
            }}
            style={{
              color: "#ff4d5a",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {isLogin ? "Create Account" : "Log In"}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "18px 20px",
  marginBottom: "18px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#171717",
  color: "#fff",
  fontSize: "18px",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "18px",
  borderRadius: "18px",
  border: "2px solid #ffd6d6",
  background: "#ff4d3d",
  color: "#fff",
  fontWeight: "800",
  fontSize: "18px",
  cursor: "pointer",
};
