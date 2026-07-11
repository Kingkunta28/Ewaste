export default function StatusBadge({ status }) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}
