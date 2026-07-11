export default function WelcomePage({ onGetStarted }) {
  return (
    <div className="auth-wrap">
      <div className="welcome-shell">
        <section className="auth-intro card">
          <h1>Smart E-Waste Collection System</h1>
          <p>Electronic waste contains toxic materials that can damage soil, water, and human health when dumped carelessly.</p>
          <div className="auth-pills">
            <span>Collection Requests</span>
            <span>Team Assignment</span>
            <span>Status Tracking</span>
          </div>
          <ul className="feature-list">
            <li>Lead, mercury, and cadmium from e-waste can pollute groundwater.</li>
            <li>Open burning of electronics releases harmful air pollutants.</li>
            <li>Responsible recycling reduces landfill pressure and carbon impact.</li>
          </ul>

          <div className="detail-section">
            <h3>Project Background</h3>
            <p>
              Rapid use of phones, computers, printers, and home appliances has increased e-waste generation in homes, offices, and
              shops. In many communities, collection is still manual, untracked, and unsafe. This platform digitizes the full process:
              request submission, assignment, collection updates, and reporting.
            </p>
          </div>

          <div className="impact-grid">
            <article>
              <h4>Soil & Water Risk</h4>
              <p>Unsafe disposal leaks heavy metals into farms and water sources.</p>
            </article>
            <article>
              <h4>Public Health Impact</h4>
              <p>Toxic exposure can affect breathing, skin, and long-term health.</p>
            </article>
            <article>
              <h4>Climate & Waste</h4>
              <p>Recovering electronics supports circular economy and less raw mining.</p>
            </article>
          </div>

          <div className="detail-grid">
            <article>
              <h4>Who Benefits</h4>
              <ul>
                <li>Residents and businesses needing safe e-waste disposal.</li>
                <li>Collection teams managing daily pickup operations.</li>
                <li>Administrators tracking requests and monthly performance.</li>
              </ul>
            </article>
            <article>
              <h4>Core Objectives</h4>
              <ul>
                <li>Make e-waste pickup easy through online requests.</li>
                <li>Improve accountability with status-based tracking.</li>
                <li>Support environmentally responsible disposal decisions.</li>
              </ul>
            </article>
          </div>

          <div className="solution-block">
            <h3>Solutions We Provide</h3>
            <div className="solution-grid">
              <article>
                <h4>Digital Pickup Requests</h4>
                <p>Users schedule e-waste collection online instead of unsafe dumping.</p>
              </article>
              <article>
                <h4>Tracking & Transparency</h4>
                <p>Every request is tracked from submission to completion with status updates.</p>
              </article>
              <article>
                <h4>Collector Coordination</h4>
                <p>Admins assign teams efficiently and monitor completion performance.</p>
              </article>
              <article>
                <h4>Monthly Reporting</h4>
                <p>Exportable reports help institutions review impact and improve planning.</p>
              </article>
            </div>
          </div>

          <button type="button" className="get-started-btn" onClick={onGetStarted}>
            Getting stated
          </button>
        </section>
      </div>
    </div>
  );
}
