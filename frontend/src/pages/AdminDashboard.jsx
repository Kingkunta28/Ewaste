import { useEffect, useState } from "react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

export default function AdminDashboard({ requests, refresh }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [collectors, setCollectors] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCollectors, setSelectedCollectors] = useState({});
  const [collectorForm, setCollectorForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    address: ""
  });
  const [showCollectorRegistration, setShowCollectorRegistration] = useState(false);
  const [showCollectorPassword, setShowCollectorPassword] = useState(false);
  const [reportMonth, setReportMonth] = useState(currentMonth);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboardData = async () => {
    const [collectorData, statData] = await Promise.all([api.listCollectors(), api.dashboardStats()]);
    setCollectors(collectorData);
    setStats(statData);
  };

  useEffect(() => {
    loadDashboardData().catch((err) => setError(err.message));
  }, []);

  const assign = async (requestId, collectorId) => {
    if (!collectorId) return;
    setError("");
    setSuccess("");
    try {
      await api.assignCollector(requestId, Number(collectorId));
      await refresh();
      setSuccess(`Request #${requestId} assigned successfully.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (requestId, status) => {
    setError("");
    setSuccess("");
    try {
      await api.updateStatus(requestId, status);
      await refresh();
      setSuccess(`Request #${requestId} marked as ${status}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const setCollectorSelection = (requestId, collectorId) => {
    setSelectedCollectors((prev) => ({ ...prev, [requestId]: collectorId }));
  };

  const updateCollectorForm = (field, value) => {
    setCollectorForm((prev) => ({ ...prev, [field]: value }));
  };

  const registerCollector = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.registerCollector(collectorForm);
      setCollectorForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        phone: "",
        address: ""
      });
      setShowCollectorPassword(false);
      setSuccess("Collector account registered successfully.");
      setShowCollectorRegistration(false);
      loadDashboardData().catch((err) => setError(err.message));
    } catch (err) {
      setError(err.message);
    }
  };

  const exportMonthlyReport = async () => {
    setError("");
    setSuccess("");
    try {
      const pdfBlob = await api.exportMonthlyReportPdf(reportMonth);
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `monthly_collection_${reportMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setSuccess("Monthly PDF report downloaded.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="role-panel role-admin">
      <div className="panel-hero admin-hero card">
        <div>
          <p className="panel-kicker">Operations Center</p>
          <h2>Admin Dashboard</h2>
          <p>Monitor incoming pickups, assign collectors, and close completed requests quickly.</p>
        </div>
        <div className="report-controls">
          <label>
            Report Month
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
          </label>
          <button type="button" onClick={exportMonthlyReport}>
            Export Monthly PDF
          </button>
        </div>
      </div>
      {stats ? (
        <div className="stats">
          <div className="stat">
            <strong>{stats.total_requests}</strong>
            <span>Total</span>
          </div>
          <div className="stat">
            <strong>{stats.pending_requests}</strong>
            <span>Pending</span>
          </div>
          <div className="stat">
            <strong>{stats.assigned_requests}</strong>
            <span>Assigned</span>
          </div>
          <div className="stat">
            <strong>{stats.completed_requests}</strong>
            <span>Completed</span>
          </div>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <div className="card table-shell">
        <button type="button" onClick={() => setShowCollectorRegistration(true)}>
          Collectors Registration
        </button>
        {showCollectorRegistration ? (
          <form className="form-grid" onSubmit={registerCollector}>
            <label>
              First Name
              <input
                type="text"
                value={collectorForm.first_name}
                onChange={(e) => updateCollectorForm("first_name", e.target.value)}
                required
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                value={collectorForm.last_name}
                onChange={(e) => updateCollectorForm("last_name", e.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={collectorForm.email}
                onChange={(e) => updateCollectorForm("email", e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <div className="password-wrap">
                <input
                  type={showCollectorPassword ? "text" : "password"}
                  value={collectorForm.password}
                  onChange={(e) => updateCollectorForm("password", e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCollectorPassword((prev) => !prev)}
                  aria-label={showCollectorPassword ? "Hide password" : "Show password"}
                  title={showCollectorPassword ? "Hide password" : "Show password"}
                >
                  {showCollectorPassword ? "\u{1F648}" : "\u{1F441}\uFE0F"}
                </button>
              </div>
            </label>
            <label>
              Phone
              <input
                type="text"
                value={collectorForm.phone}
                onChange={(e) => updateCollectorForm("phone", e.target.value)}
              />
            </label>
            <label>
              Address
              <input
                type="text"
                value={collectorForm.address}
                onChange={(e) => updateCollectorForm("address", e.target.value)}
              />
            </label>
            <button type="submit">Register Collector</button>
          </form>
        ) : null}
      </div>

      <div className="card table-shell">
        <div className="section-head">
          <h3>Manage Requests</h3>
          <p>Assign a collector and update statuses from one control table.</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Item</th>
              <th>Status</th>
              <th>Collector</th>
              <th>Assign</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.id}</td>
                <td>{req.user.username}</td>
                <td>{req.item_type}</td>
                <td>
                  <StatusBadge status={req.status} />
                </td>
                <td>{req.assigned_collector?.username || "-"}</td>
                <td>
                  <select
                    value={selectedCollectors[req.id] || ""}
                    onChange={(e) => setCollectorSelection(req.id, e.target.value)}
                  >
                    <option value="">Select</option>
                    {collectors.map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.username}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      onClick={() => assign(req.id, selectedCollectors[req.id])}
                      disabled={!selectedCollectors[req.id]}
                    >
                      Assign
                    </button>
                    <button type="button" onClick={() => setStatus(req.id, "completed")}>
                      Complete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

