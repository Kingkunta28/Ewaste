import { useState } from "react";
import { api } from "../api";

export default function AuthPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    address: ""
  });
  const [resetForm, setResetForm] = useState({
    email: "",
    new_password: "",
    confirm_password: ""
  });
  const [authMessage, setAuthMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const onResetChange = (key, value) => setResetForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setAuthMessage("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== form.confirm_password) {
          throw new Error("Passwords do not match");
        }
        await api.register({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address
        });
        setAuthMessage("Registration successful. Please log in.");
        setMode("login");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setForm((prev) => ({
          ...prev,
          password: "",
          confirm_password: ""
        }));
        return;
      }
      const result = await api.login({ email: form.email, password: form.password });
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);
    try {
      if (resetForm.new_password !== resetForm.confirm_password) {
        throw new Error("Passwords do not match");
      }
      await api.forgotPassword({
        email: resetForm.email,
        new_password: resetForm.new_password
      });
      setResetMessage("Password reset successful. You can now log in.");
      setShowResetPassword(false);
      setMode("login");
      setResetForm({ email: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-card card auth-only">
        <div className="auth-heading">
          <h3>Sign In to Continue</h3>
          <p>Join the system to request safe e-waste pickup and track progress.</p>
        </div>
        {!showResetPassword ? (
          <>
            <div className="tabs">
              <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
                Login
              </button>
              <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
                Register
              </button>
            </div>
            <form onSubmit={submit}>
              {mode === "register" && (
                <>
                  <label>
                    First Name
                    <input value={form.first_name} onChange={(e) => onChange("first_name", e.target.value)} required />
                  </label>
                  <label>
                    Last Name
                    <input value={form.last_name} onChange={(e) => onChange("last_name", e.target.value)} required />
                  </label>
                </>
              )}
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
              </label>
              <label>
                Password
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => onChange("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              {mode === "register" && (
                <label>
                  Confirm Password
                  <div className="password-wrap">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirm_password}
                      onChange={(e) => onChange("confirm_password", e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </label>
              )}
              {mode === "register" && (
                <>
                  <label>
                    Phone
                    <input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
                  </label>
                  <label>
                    Address
                    <input value={form.address} onChange={(e) => onChange("address", e.target.value)} />
                  </label>
                </>
              )}
              {error ? <p className="error">{error}</p> : null}
              {authMessage ? <p className="success">{authMessage}</p> : null}
              {resetMessage ? <p className="success">{resetMessage}</p> : null}
              <button disabled={loading} type="submit">
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account and login"}
              </button>
            </form>
            {mode === "login" ? (
              <button type="button" className="link-btn" onClick={() => setShowResetPassword(true)}>
                Forgot password?
              </button>
            ) : null}
            <button type="button" className="get-started-btn auth-back-btn" onClick={onBack}>
              Back to About Page
            </button>
          </>
        ) : (
          <>
            <h3>Reset Password</h3>
            <form onSubmit={submitResetPassword}>
              <label>
                Email
                <input type="email" value={resetForm.email} onChange={(e) => onResetChange("email", e.target.value)} required />
              </label>
              <label>
                New Password
                <div className="password-wrap">
                  <input
                    type={showResetNewPassword ? "text" : "password"}
                    value={resetForm.new_password}
                    onChange={(e) => onResetChange("new_password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowResetNewPassword((prev) => !prev)}
                    aria-label={showResetNewPassword ? "Hide password" : "Show password"}
                    title={showResetNewPassword ? "Hide password" : "Show password"}
                  >
                    {showResetNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              <label>
                Confirm Password
                <div className="password-wrap">
                  <input
                    type={showResetConfirmPassword ? "text" : "password"}
                    value={resetForm.confirm_password}
                    onChange={(e) => onResetChange("confirm_password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                    aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
                    title={showResetConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showResetConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              {error ? <p className="error">{error}</p> : null}
              <button disabled={loading} type="submit">
                {loading ? "Please wait..." : "Reset Password"}
              </button>
            </form>
            <button type="button" className="link-btn" onClick={() => setShowResetPassword(false)}>
              Back to login
            </button>
            <button type="button" className="get-started-btn auth-back-btn" onClick={onBack}>
              Back to About Page
            </button>
          </>
        )}
      </section>
    </div>
  );
}
