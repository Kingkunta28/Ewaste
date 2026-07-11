import { useEffect, useState } from "react";
import { api } from "../api";

const initialProfile = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: ""
};

export default function UserProfilePage({ onProfileSaved }) {
  const [form, setForm] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getProfile()
      .then((profile) => {
        setForm({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || ""
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await api.updateProfile(form);
      setSuccess(result.message || "Profile updated");
      if (onProfileSaved) {
        onProfileSaved(result.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="role-panel role-user">
        <div className="card">Loading profile...</div>
      </section>
    );
  }

  return (
    <section className="role-panel role-user">
      <div className="panel-hero user-hero card">
        <div>
          <p className="panel-kicker">Account Center</p>
          <h2>My Profile</h2>
          <p>Update your personal details used for communication and pickup coordination.</p>
        </div>
      </div>

      <form className="card profile-card" onSubmit={submit}>
        <div className="section-head">
          <h3>Profile Information</h3>
          <p>Keep your contact information up to date.</p>
        </div>
        <div className="grid">
          <label>
            First Name
            <input value={form.first_name} onChange={(e) => onChange("first_name", e.target.value)} />
          </label>
          <label>
            Last Name
            <input value={form.last_name} onChange={(e) => onChange("last_name", e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
          </label>
          <label>
            Address
            <input value={form.address} onChange={(e) => onChange("address", e.target.value)} />
          </label>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <button disabled={saving} type="submit">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}
