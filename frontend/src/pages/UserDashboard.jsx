import { useEffect, useState } from "react";
import { api } from "../api";
import RequestTable from "../components/RequestTable";
import { ewasteBrandOptionsByItem, ewasteConditionOptions, ewasteItemOptions, initialRequestForm } from "../constants";

export default function UserDashboard({ requests, refresh, activeView = "dashboard" }) {
  const [form, setForm] = useState(initialRequestForm);
  const [customBrand, setCustomBrand] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingCount = requests.filter((item) => item.status === "pending").length;
  const assignedCount = requests.filter((item) => item.status === "assigned").length;
  const completedCount = requests.filter((item) => item.status === "completed").length;
  const selectedBrandOptions = ewasteBrandOptionsByItem[form.item_type] || ["Other"];
  const showCustomBrandInput = form.brand === "Other";

  useEffect(() => {
    const sectionByView = {
      "new-request": "new-pickup-request",
      requests: "pickup-history"
    };
    const sectionId = sectionByView[activeView];
    if (sectionId) {
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (activeView === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeView]);

  const onChange = (key, value) => {
    if (key === "item_type") {
      setForm((prev) => ({ ...prev, item_type: value, brand: "" }));
      setCustomBrand("");
      return;
    }
    if (key === "brand" && value !== "Other") {
      setCustomBrand("");
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const brandToSubmit = form.brand === "Other" ? customBrand.trim() : form.brand;
      await api.createRequest({ ...form, brand: brandToSubmit, quantity: Number(form.quantity) || 1 });
      setForm(initialRequestForm);
      setCustomBrand("");
      await refresh();
      setSuccess("Pickup request submitted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="role-panel role-user">
      <div className="user-hero card">
        <div>
          <p className="user-kicker">Resident Portal</p>
          <h2>User Dashboard</h2>
          <p className="user-subtitle">Submit your electronic waste pickup and track each request from pending to completion.</p>
        </div>
        <div className="user-stats">
          <article className="user-stat-box">
            <span className="stat-icon green">▤</span>
            <strong>{requests.length}</strong>
            <span>Total Requests</span>
            <small>All time</small>
          </article>
          <article className="user-stat-box">
            <span className="stat-icon amber">◷</span>
            <strong>{pendingCount}</strong>
            <span>Pending</span>
            <small>Awaiting review</small>
          </article>
          <article className="user-stat-box">
            <span className="stat-icon blue">⌁</span>
            <strong>{assignedCount}</strong>
            <span>Assigned</span>
            <small>Collector ready</small>
          </article>
          <article className="user-stat-box">
            <span className="stat-icon lime">✓</span>
            <strong>{completedCount}</strong>
            <span>Completed</span>
            <small>Safely recycled</small>
          </article>
        </div>
      </div>

      <div className="dashboard-insights">
        <article className="card eco-impact-widget">
          <div className="widget-head"><div><span className="section-kicker">ENVIRONMENTAL IMPACT</span><h3>Your positive footprint</h3></div><span className="widget-icon">♧</span></div>
          <div className="impact-widget-stats"><div><strong>{(completedCount * 3.4).toFixed(1)} kg</strong><span>E-waste diverted</span></div><div><strong>{(completedCount * 2.1).toFixed(1)} kg</strong><span>CO₂ avoided</span></div><div><strong>{completedCount * 14}</strong><span>Impact points</span></div></div>
          <div className="goal-row"><span>Monthly green goal</span><strong>{Math.min(completedCount * 20, 100)}%</strong></div><div className="goal-bar"><i style={{ width: `${Math.min(completedCount * 20, 100)}%` }} /></div>
        </article>
        <article className="card recycling-tip"><span className="tip-art">♻</span><span className="section-kicker">QUICK TIP</span><h3>Protect your data first</h3><p>Back up your files and sign out of all accounts before handing over a phone or computer.</p><a href="#tips">Explore recycling tips →</a></article>
      </div>

      <form id="new-pickup-request" className="card user-form-card" onSubmit={submit}>
        <div className="section-head">
          <h3>Request E-Waste Pickup</h3>
          <p>Fill in accurate item and location details for faster assignment.</p>
        </div>
        <div className="grid">
          <label>
            Item Type
            <select value={form.item_type} onChange={(e) => onChange("item_type", e.target.value)} required>
              <option value="">Select item type</option>
              {ewasteItemOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input min={1} type="number" value={form.quantity} onChange={(e) => onChange("quantity", e.target.value)} required />
          </label>
          <label>
            Condition
            <select value={form.condition} onChange={(e) => onChange("condition", e.target.value)} required>
              <option value="">Select condition</option>
              {ewasteConditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select value={form.brand} onChange={(e) => onChange("brand", e.target.value)} required={!!form.item_type}>
              <option value="">Select brand</option>
              {selectedBrandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          {showCustomBrandInput && (
            <label>
              Custom Brand
              <input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} required />
            </label>
          )}
          <label>
            Pickup Date
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.pickup_date} onChange={(e) => onChange("pickup_date", e.target.value)} required />
          </label>
          <label>
            Address
            <input value={form.pickup_address} onChange={(e) => onChange("pickup_address", e.target.value)} required />
          </label>
        </div>
        <label>
          Notes
          <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <button disabled={saving} type="submit">
          {saving ? "Submitting..." : "Submit Pickup Request"}
        </button>
      </form>

      <div id="pickup-history" className="user-history">
        <div className="section-head">
          <h3>Pickup History</h3>
          <p>Track all your submitted requests and their current processing status.</p>
        </div>
        <RequestTable rows={requests} showTitle={false} />
      </div>
    </section>
  );
}
