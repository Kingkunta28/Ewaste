import { useState } from "react";
import { api } from "../api";
import BrandMark from "../components/BrandMark";

function PasswordField({ label, value, onChange, visible, onToggle, placeholder = "Enter your password" }) {
  return (
    <label className="field-label">{label}
      <div className="input-shell"><span className="input-icon">⌑</span><input type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} required /><button type="button" className="password-toggle" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>{visible ? "Hide" : "Show"}</button></div>
    </label>
  );
}

export default function AuthPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", confirm_password: "", phone: "", address: "" });
  const [resetForm, setResetForm] = useState({ email: "", new_password: "", confirm_password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const onResetChange = (key, value) => setResetForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault(); setError(""); setAuthMessage(""); setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== form.confirm_password) throw new Error("Passwords do not match");
        if (!agreed) throw new Error("Please agree to the Terms & Privacy Policy");
        await api.register({ first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password, phone: form.phone, address: form.address });
        setAuthMessage("Account created successfully. Please log in."); setMode("login"); setShowPassword(false); setShowConfirmPassword(false); setForm((prev) => ({ ...prev, password: "", confirm_password: "" })); return;
      }
      const result = await api.login({ email: form.email, password: form.password }); onLogin(result.user);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault(); setError(""); setResetMessage(""); setLoading(true);
    try {
      if (resetForm.new_password !== resetForm.confirm_password) throw new Error("Passwords do not match");
      await api.forgotPassword({ email: resetForm.email, new_password: resetForm.new_password });
      setResetMessage("Password reset successful. You can now log in."); setShowResetPassword(false); setMode("login"); setResetForm({ email: "", new_password: "", confirm_password: "" });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const setAuthMode = (nextMode) => { setMode(nextMode); setShowResetPassword(false); setError(""); setAuthMessage(""); };

  return (
    <div className="auth-page">
      <button className="auth-home" type="button" onClick={onBack}><BrandMark /></button>
      <section className="auth-showcase">
        <div className="auth-art"><img src="/eco-hero.png" alt="Sustainable e-waste collection ecosystem" /></div>
        <div className="auth-float auth-leaf-one">◆</div><div className="auth-float auth-leaf-two">●</div><div className="auth-float auth-recycle">♻</div>
        <div className="auth-showcase-copy"><span className="auth-pill">♻ SMARTER RECYCLING</span><h1>Every device has<br />a <em>next chapter.</em></h1><p>Join a growing community making electronics disposal safe, transparent, and impactful.</p><div className="auth-proof"><div className="avatar-stack"><span>A</span><span>K</span><span>J</span></div><div><strong>2,000+ members</strong><small>already recycling smarter</small></div></div></div>
        <div className="auth-glow" />
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <button className="back-link" type="button" onClick={onBack}>← Back to home</button>
          {!showResetPassword ? (
            <>
              <div className="auth-heading"><span className="auth-mini-logo"><BrandMark compact /></span><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2><p>{mode === "login" ? "Enter your details to access your dashboard." : "Start your journey toward responsible recycling."}</p></div>
              <div className="tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} type="button">Log in</button><button className={mode === "register" ? "active" : ""} onClick={() => setAuthMode("register")} type="button">Sign up</button></div>
              <form className="auth-form" onSubmit={submit}>
                {mode === "register" ? <div className="form-row"><label className="field-label">First name<div className="input-shell"><span className="input-icon">○</span><input value={form.first_name} onChange={(e) => onChange("first_name", e.target.value)} placeholder="First name" required /></div></label><label className="field-label">Last name<div className="input-shell"><span className="input-icon">○</span><input value={form.last_name} onChange={(e) => onChange("last_name", e.target.value)} placeholder="Last name" required /></div></label></div> : null}
                <label className="field-label">Email address<div className="input-shell"><span className="input-icon">@</span><input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="you@example.com" required /></div></label>
                {mode === "register" ? <label className="field-label">Phone number<div className="input-shell"><span className="input-icon">◇</span><input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+255 700 000 000" /></div></label> : null}
                <PasswordField label="Password" value={form.password} onChange={(e) => onChange("password", e.target.value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                {mode === "register" && form.password ? <div className="password-strength"><span><i style={{ width: `${Math.min(form.password.length * 10, 100)}%` }} /></span><small>{form.password.length >= 10 ? "Strong password" : form.password.length >= 7 ? "Good password" : "Keep strengthening your password"}</small></div> : null}
                {mode === "register" ? <PasswordField label="Confirm password" value={form.confirm_password} onChange={(e) => onChange("confirm_password", e.target.value)} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} placeholder="Repeat your password" /> : null}
                {mode === "login" ? <div className="form-options"><label className="check-label"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span />Remember me</label><button type="button" className="text-link" onClick={() => setShowResetPassword(true)}>Forgot password?</button></div> : <label className="check-label terms"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span />I agree to the <a href="#terms">Terms & Privacy Policy</a></label>}
                {error ? <p className="error message-box">{error}</p> : null}{authMessage ? <p className="success message-box">{authMessage}</p> : null}{resetMessage ? <p className="success message-box">{resetMessage}</p> : null}
                <button className="auth-submit" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "login" ? "Log in to dashboard" : "Create account"}<span>→</span></button>
              </form>
              <p className="auth-switch">{mode === "login" ? "New to Smart E-Waste?" : "Already have an account?"} <button type="button" onClick={() => setAuthMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Log in"}</button></p>
            </>
          ) : (
            <><div className="auth-heading"><span className="auth-mini-logo"><BrandMark compact /></span><h2>Reset your password</h2><p>Enter your account email and choose a secure new password.</p></div><form className="auth-form" onSubmit={submitResetPassword}><label className="field-label">Email address<div className="input-shell"><span className="input-icon">@</span><input type="email" value={resetForm.email} onChange={(e) => onResetChange("email", e.target.value)} required /></div></label><PasswordField label="New password" value={resetForm.new_password} onChange={(e) => onResetChange("new_password", e.target.value)} visible={showResetNewPassword} onToggle={() => setShowResetNewPassword((value) => !value)} /><PasswordField label="Confirm password" value={resetForm.confirm_password} onChange={(e) => onResetChange("confirm_password", e.target.value)} visible={showResetConfirmPassword} onToggle={() => setShowResetConfirmPassword((value) => !value)} />{error ? <p className="error message-box">{error}</p> : null}<button className="auth-submit" disabled={loading} type="submit">{loading ? "Please wait…" : "Reset password"}<span>→</span></button></form><button type="button" className="reset-back" onClick={() => setShowResetPassword(false)}>← Back to log in</button></>
          )}
          <p className="secure-note">⌾ Your information is encrypted and secure</p>
        </div>
      </section>
    </div>
  );
}
