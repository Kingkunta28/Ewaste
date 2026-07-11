import StatusBadge from "./StatusBadge";

export default function RequestTable({ rows, showTitle = true }) {
  if (!rows.length) {
    return (
      <div className="card empty-state">
        <h3>No Requests Yet</h3>
        <p>Your submitted pickup requests will appear here once you create one.</p>
      </div>
    );
  }

  return (
    <div className="card table-shell">
      {showTitle ? <h3>Pickup Requests</h3> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Date</th>
            <th>Status</th>
            <th>Collector</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((req) => (
            <tr key={req.id}>
              <td>{req.id}</td>
              <td>{req.item_type}</td>
              <td>{req.quantity}</td>
              <td>{req.pickup_date}</td>
              <td>
                <StatusBadge status={req.status} />
              </td>
              <td>{req.assigned_collector?.username || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
