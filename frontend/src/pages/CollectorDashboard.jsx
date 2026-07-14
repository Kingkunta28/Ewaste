import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

export default function CollectorDashboard({
  requests,
  refresh,
  activeView = "dashboard",
}) {
  const [error, setError] = useState("");
  const [mapAddress, setMapAddress] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const completedCount = requests.filter(
    (item) => item.status === "completed",
  ).length;
  const assignedCount = requests.filter(
    (item) => item.status === "assigned",
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = requests.filter(
    (item) => item.status === "assigned" && item.pickup_date === today,
  ).length;
  const visibleRequests = useMemo(
    () =>
      requests
        .filter((item) => item.status === "assigned")
        .sort((a, b) => {
          const aTime = new Date(a.pickup_date).getTime();
          const bTime = new Date(b.pickup_date).getTime();
          return aTime - bTime;
        }),
    [requests],
  );

  useEffect(() => {
    const sectionId =
      activeView === "assigned-tasks"
        ? "collector-assigned-tasks"
        : activeView === "completed-tasks"
          ? "collector-completed-tasks"
          : "";
    if (sectionId) {
      requestAnimationFrame(() =>
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } else if (activeView === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeView]);
  const collectedHistory = useMemo(
    () =>
      requests
        .filter((item) => item.status === "completed")
        .sort((a, b) => {
          const aTime = new Date(a.completed_at || a.created_at).getTime();
          const bTime = new Date(b.completed_at || b.created_at).getTime();
          return bTime - aTime;
        }),
    [requests],
  );

  const setStatus = async (requestId, status) => {
    setError("");
    setUpdatingId(requestId);
    try {
      await api.updateStatus(requestId, status);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const openMap = (address) => {
    setMapAddress(address || "");
  };

  return (
    <section className="role-panel role-collector">
      <div className="panel-hero collector-hero card">
        <div>
          <p className="panel-kicker">Field Team</p>
          <h2>Collector Dashboard</h2>
          <p>
            View your assigned pickups, complete collections, and keep the
            request queue moving.
          </p>
        </div>
        <div className="collector-mini-stats">
          <article>
            <strong>{todayCount}</strong>
            <span>Today's Tasks</span>
          </article>
          <article>
            <strong>{assignedCount}</strong>
            <span>Assigned Tasks</span>
          </article>
          <article>
            <strong>{completedCount}</strong>
            <span>Completed Tasks</span>
          </article>
          <article>
            <strong>{requests.length}</strong>
            <span>Total Collections</span>
          </article>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="collector-performance">
        <article className="card">
          <span>Daily progress</span>
          <strong>
            {todayCount}/{Math.max(todayCount, 4)}
          </strong>
          <div>
            <i
              style={{
                width: `${Math.min((todayCount / Math.max(todayCount, 4)) * 100, 100)}%`,
              }}
            />
          </div>
        </article>
        <article className="card">
          <span>Weekly collections</span>
          <strong>{completedCount}</strong>
          <small>Safe pickups completed</small>
        </article>
        <article className="card">
          <span>Monthly performance</span>
          <strong>
            {requests.length
              ? Math.round((completedCount / requests.length) * 100)
              : 0}
            %
          </strong>
          <small>Completion rate</small>
        </article>
      </div>
      <div
        id="collector-assigned-tasks"
        className="card collector-workflow-section"
      >
        <div className="section-head">
          <h3>Assigned Pickups</h3>
          <p>
            Mark completed after successful collection at the pickup location.
          </p>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Item</th>
                <th>Date</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.length ? (
                visibleRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.user.username}</td>
                    <td>{req.item_type}</td>
                    <td>{req.pickup_date}</td>
                    <td>{req.pickup_address}</td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => openMap(req.pickup_address)}
                        >
                          View Map
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === req.id}
                          onClick={() => setStatus(req.id, "completed")}
                        >
                          {updatingId === req.id
                            ? "Updating..."
                            : "Mark Complete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No assigned pickups awaiting collection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="collector-completed-tasks"
        className="card collector-workflow-section"
      >
        <div className="section-head">
          <h3>Pickup Location Map</h3>
          <p>
            {mapAddress
              ? `Showing map for: ${mapAddress}`
              : "Select View Map on a pickup request to load location."}
          </p>
        </div>
        {mapAddress ? (
          <iframe
            title="Pickup location map"
            className="map-frame"
            src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="empty-state">
            <h3>No Location Selected</h3>
            <p>
              Choose any assigned pickup and click View Map to display it here.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-head">
          <h3>Collected History</h3>
          <p>Completed pickups handled by your account.</p>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Item</th>
                <th>Date</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {collectedHistory.length ? (
                collectedHistory.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.user.username}</td>
                    <td>{req.item_type}</td>
                    <td>{req.pickup_date}</td>
                    <td>{req.pickup_address}</td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No completed pickups yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
