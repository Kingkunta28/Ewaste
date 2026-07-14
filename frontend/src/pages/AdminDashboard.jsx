import { useEffect, useState } from "react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

export default function AdminDashboard({ requests, refresh, activeView = "dashboard" }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [collectors, setCollectors] = useState([]);
  const [users, setUsers] = useState([]);
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
  const [exportingReport, setExportingReport] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const cancelledCount = requests.filter((item) => item.status === "cancelled").length;

  const loadDashboardData = async () => {
    const [collectorData, userData, statData] = await Promise.all([api.listCollectors(), api.listUsers(), api.dashboardStats()]);
    setCollectors(collectorData);
    setUsers(userData);
    setStats(statData);
  };

  useEffect(() => {
    loadDashboardData().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const sectionByView = {
      reports: "admin-reports",
      analytics: "admin-analytics",
      collectors: "admin-collectors",
      users: "admin-users",
      "manage-requests": "admin-manage-requests"
    };
    const sectionId = sectionByView[activeView];
    if (sectionId) {
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else if (activeView === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeView]);

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
    if (!reportMonth || exportingReport) return;
    setExportingReport(true);
    try {
      const link = document.createElement("a");
      link.href = api.monthlyReportUrl(reportMonth);
      link.download = `smart_ewaste_monthly_report_${reportMonth}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess("Monthly PDF report download started.");
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <section className="role-panel role-admin">
      <div id="admin-reports" className="panel-hero admin-hero card admin-workspace-section">
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
          <button type="button" onClick={exportMonthlyReport} disabled={exportingReport || !reportMonth}>
            {exportingReport ? "Generating PDF..." : "Export Monthly PDF"}
          </button>
        </div>
      </div>
      {stats ? (
        <div className="stats">
          <div className="stat">
            <strong>{stats.total_requests}</strong>
            <span>Total Requests</span>
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
          <div className="stat"><strong>{users.filter((systemUser) => systemUser.is_active).length}</strong><span>Active Users</span></div>
          <div className="stat"><strong>{cancelledCount}</strong><span>Cancelled</span></div>
          <div className="stat"><strong>{collectors.length}</strong><span>Active Collectors</span></div>
        </div>
      ) : null}
      <div id="admin-analytics" className="admin-analytics-grid admin-workspace-section">
        <article className="card mini-chart-card"><div className="section-head"><h3>Requests by Month</h3><p>Collection activity overview</p></div><div className="bar-chart" aria-label="Monthly requests chart">{[38,55,42,72,61,88,76,92].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div><div className="chart-labels"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span></div></article>
        <article className="card status-chart-card"><div className="section-head"><h3>Request Status</h3><p>Current distribution</p></div><div className="donut-chart" style={{"--complete": `${requests.length ? Math.round((requests.filter((item)=>item.status==="completed").length/requests.length)*100) : 0}%`}}><span>{requests.length}<small>Total</small></span></div><div className="chart-legend"><span><i className="green-dot"/>Completed</span><span><i className="amber-dot"/>Pending</span><span><i className="blue-dot"/>Assigned</span></div></article>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <div id="admin-collectors" className="card table-shell admin-workspace-section">
        <div className="section-head"><h3>Collectors</h3><p>Collector accounts registered in the system.</p></div>
        <div className="quick-actions collector-actions">
          <button className="action-primary" type="button" onClick={() => setShowCollectorRegistration(true)}>
            <span aria-hidden="true">+</span> Add Collector
          </button>
          <button className="action-secondary" type="button" onClick={exportMonthlyReport} disabled={exportingReport || !reportMonth}>
            <span aria-hidden="true">▥</span> {exportingReport ? "Generating PDF..." : "Generate PDF Report"}
          </button>
          <button className="action-secondary" type="button" onClick={() => window.print()}>
            <span aria-hidden="true">↓</span> Export Data
          </button>
        </div>
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
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead>
          <tbody>{collectors.length ? collectors.map((collector) => <tr key={collector.id}><td>{`${collector.first_name || ""} ${collector.last_name || ""}`.trim() || "-"}</td><td>{collector.username}</td><td>{collector.email || "-"}</td><td>{collector.profile__phone || "-"}</td><td>{collector.profile__address || "-"}</td><td>{collector.is_active ? "Active" : "Inactive"}</td></tr>) : <tr><td colSpan={6}>No collectors registered.</td></tr>}</tbody>
        </table>
      </div>

      <div id="admin-users" className="card table-shell admin-workspace-section">
        <div className="section-head"><h3>System Users</h3><p>Standard user accounts registered in the system.</p></div>
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Address</th><th>Joined</th><th>Status</th></tr></thead>
          <tbody>{users.length ? users.map((systemUser) => <tr key={systemUser.id}><td>{`${systemUser.first_name || ""} ${systemUser.last_name || ""}`.trim() || "-"}</td><td>{systemUser.username}</td><td>{systemUser.email || "-"}</td><td>{systemUser.profile__phone || "-"}</td><td>{systemUser.profile__address || "-"}</td><td>{new Date(systemUser.date_joined).toLocaleDateString()}</td><td>{systemUser.is_active ? "Active" : "Inactive"}</td></tr>) : <tr><td colSpan={7}>No users registered.</td></tr>}</tbody>
        </table>
      </div>

      <div id="admin-manage-requests" className="card table-shell admin-workspace-section">
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
                      disabled={!selectedCollectors[req.id] || ["completed", "cancelled"].includes(req.status)}
                    >
                      Assign
                    </button>
                    <button type="button" onClick={() => setStatus(req.id, "completed")} disabled={!req.assigned_collector || req.status === "completed"}>
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

