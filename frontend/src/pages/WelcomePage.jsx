import { useEffect, useState } from "react";
import BrandMark from "../components/BrandMark";

const features = [
  { icon: "↗", title: "Smart Scheduling", text: "Book a convenient pickup in less than two minutes." },
  { icon: "◎", title: "Live Tracking", text: "Follow every request from submission to safe collection." },
  { icon: "♻", title: "Verified Recycling", text: "Your devices enter responsible recovery channels." }
];

const services = [
  { icon: "▣", title: "Home Pickup", text: "Doorstep collection for phones, computers, batteries, and appliances." },
  { icon: "⌁", title: "Business Collection", text: "Flexible bulk collection plans for offices, schools, and institutions." },
  { icon: "◒", title: "Collection Centers", text: "Find trusted drop-off locations close to your neighborhood." }
];

const faqs = [
  ["What types of e-waste do you collect?", "We collect phones, laptops, computers, printers, televisions, batteries, cables, and most household electronics."],
  ["Is the pickup service free?", "Pickup availability and fees depend on location, item type, and quantity. Your request summary provides the applicable details."],
  ["What happens to my devices?", "Collected devices are sorted for safe reuse, refurbishment, material recovery, or certified disposal."],
  ["Can organizations request bulk collection?", "Yes. Schools, offices, and businesses can schedule larger collections through the same request process."]
];

export default function WelcomePage({ onGetStarted }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); observer.disconnect(); };
  }, []);

  return (
    <div className="landing-page">
      <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
        <a className="brand-link" href="#top" aria-label="Smart E-Waste home"><BrandMark /></a>
        <nav className={`nav-links ${menuOpen ? "menu-open" : ""}`} aria-label="Main navigation">
          <a href="#top" onClick={() => setMenuOpen(false)}>Home</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <div className="nav-actions">
          <button className="text-button" type="button" onClick={onGetStarted}>Log in</button>
          <button className="nav-cta" type="button" onClick={onGetStarted}>Sign up <span>↗</span></button>
          <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span /><span /></button>
        </div>
      </header>

      <main>
        <section className="hero-section" id="top">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> A cleaner tomorrow starts today</div>
            <h1>Manage E-Waste.<br /><span>Protect Our Future.</span></h1>
            <p>Schedule responsible electronics collection, track every pickup, and see the environmental difference you make—all in one simple platform.</p>
            <div className="hero-actions">
              <button className="primary-cta" type="button" onClick={onGetStarted}>Schedule a Pickup <span>↗</span></button>
              <a className="secondary-cta" href="#about">Learn more <span>↓</span></a>
            </div>
            <div className="trust-row">
              <div className="avatar-stack"><span>M</span><span>J</span><span>A</span><span>+</span></div>
              <div><strong>4.9/5</strong><small>Trusted by 2,000+ responsible recyclers</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <span className="hero-particle leaf-one">◆</span><span className="hero-particle leaf-two">●</span><span className="hero-particle recycle-float">♻</span><span className="hero-cloud cloud-one" /><span className="hero-cloud cloud-two" />
            <img src="/eco-hero.png" alt="Smart recycling bin, electronics, renewable energy, and a sustainable city" />
            <div className="floating-stat stat-recycled"><span>♻</span><div><strong>12,480 kg</strong><small>E-waste recycled</small></div></div>
            <div className="floating-stat stat-carbon"><span>↓</span><div><strong>32% less CO₂</strong><small>This quarter</small></div></div>
          </div>
        </section>

        <section className="logo-strip" aria-label="Impact summary">
          <span>Trusted for responsible collection</span>
          <strong>HOUSEHOLDS</strong><strong>UNIVERSITIES</strong><strong>BUSINESSES</strong><strong>COMMUNITIES</strong>
        </section>

        <section className="content-section reveal-on-scroll" id="about">
          <div className="section-heading centered"><span className="section-kicker">WHY SMART E-WASTE</span><h2>A smarter way to recycle electronics</h2><p>Safe disposal should feel effortless. We connect people, collectors, and responsible recycling through one transparent system.</p></div>
          <div className="feature-cards">{features.map((item) => <article className="feature-card" key={item.title}><span className="feature-icon">{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p><a href="#how">Discover more <span>→</span></a></article>)}</div>
        </section>

        <section className="services-section reveal-on-scroll" id="services">
          <div className="section-heading"><span className="section-kicker">OUR SERVICES</span><h2>Every device deserves<br />a responsible next step.</h2></div>
          <div className="service-layout">
            <div className="service-list">{services.map((item, index) => <article className="service-row" key={item.title}><span className="service-number">0{index + 1}</span><span className="service-icon">{item.icon}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><span className="round-arrow">↗</span></article>)}</div>
            <div className="impact-card"><span className="impact-label">LIVE IMPACT</span><h3>Small actions.<br />Measurable change.</h3><div className="impact-meter"><span style={{ width: "78%" }} /></div><div className="impact-numbers"><div><strong>78%</strong><small>recovery rate</small></div><div><strong>8.4t</strong><small>CO₂ avoided</small></div></div><div className="leaf-watermark">♧</div></div>
          </div>
        </section>

        <section className="content-section steps-section reveal-on-scroll" id="how">
          <div className="section-heading centered"><span className="section-kicker">HOW IT WORKS</span><h2>From your door to a greener future</h2></div>
          <div className="steps-grid"><div className="step-line" />{[
            ["01", "Tell us what you have", "Choose your device type and add a few pickup details."],
            ["02", "Choose your date", "Pick a convenient day and confirm your collection address."],
            ["03", "We collect safely", "A verified collector handles your electronics responsibly."],
            ["04", "Track your impact", "See the status and environmental benefit in your dashboard."]
          ].map(([number, title, text]) => <article className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="impact-band reveal-on-scroll">
          <div><span className="section-kicker light">OUR COLLECTIVE IMPACT</span><h2>Progress you can see.<br />A future we can share.</h2></div>
          <div className="impact-stats"><article><strong>12.4<span>t</span></strong><p>E-waste diverted</p></article><article><strong>2.8<span>k</span></strong><p>Pickups completed</p></article><article><strong>8.4<span>t</span></strong><p>CO₂ emissions avoided</p></article><article><strong>98<span>%</span></strong><p>Happy recyclers</p></article></div>
        </section>

        <section className="content-section testimonial-section reveal-on-scroll">
          <div className="quote-mark">“</div><blockquote>Smart E-Waste made responsible disposal genuinely simple. Our university cleared years of old equipment and we could track every collection from start to finish.</blockquote><div className="quote-person"><span>AM</span><div><strong>Amina Mussa</strong><small>Facilities Coordinator</small></div></div>
        </section>

        <section className="content-section faq-section reveal-on-scroll">
          <div className="section-heading"><span className="section-kicker">COMMON QUESTIONS</span><h2>Everything you need<br />to know.</h2><p>Still curious? Our team is ready to help.</p><a className="secondary-cta" href="#contact">Contact support →</a></div>
          <div className="faq-list">{faqs.map(([question, answer], index) => <article className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><b>{openFaq === index ? "−" : "+"}</b></button>{openFaq === index ? <p>{answer}</p> : null}</article>)}</div>
        </section>

        <section className="cta-banner reveal-on-scroll" id="contact"><div><span className="section-kicker light">READY WHEN YOU ARE</span><h2>Turn old tech into<br />new possibilities.</h2><p>Schedule your first collection today and become part of the circular economy.</p></div><button type="button" onClick={onGetStarted}>Schedule a pickup <span>↗</span></button></section>
      </main>

      <footer className="landing-footer"><div><BrandMark /><p>Smart collection for a cleaner, more circular future.</p></div><div><strong>Platform</strong><a href="#services">Services</a><a href="#how">How it works</a><button type="button" onClick={onGetStarted}>Dashboard</button></div><div><strong>Company</strong><a href="#about">About us</a><a href="#contact">Contact</a><a href="#top">Privacy</a></div><div><strong>Stay in the loop</strong><p>Practical tips for responsible electronics disposal.</p><div className="newsletter"><input aria-label="Email address" placeholder="Email address" /><button type="button">→</button></div></div><div className="footer-bottom"><span>© 2026 Smart E-Waste. Built for a greener tomorrow.</span><span>Zanzibar, Tanzania</span></div></footer>
    </div>
  );
}
