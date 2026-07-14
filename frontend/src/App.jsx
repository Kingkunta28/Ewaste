import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { USER_STORAGE_KEY } from "./constants";
import AuthPage from "./pages/AuthPage";
import WelcomePage from "./pages/WelcomePage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CollectorDashboard from "./pages/CollectorDashboard";
import UserProfilePage from "./pages/UserProfilePage";
import BackgroundShapes from "./components/BackgroundShapes";
import BrandMark from "./components/BrandMark";

export default function App() {
  const readGuestView = () => ((window.location.hash || "").toLowerCase() === "#/auth" ? "auth" : "welcome");
  const readUserView = () => {
    const match = (window.location.hash || "").toLowerCase().match(/^#\/workspace\/(dashboard|new-request|requests|profile|assigned-tasks|completed-tasks|manage-requests|users|collectors|reports|analytics)$/);
    return match?.[1] || "dashboard";
  };
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestView, setGuestView] = useState(readGuestView);
  const [userView, setUserView] = useState(readUserView);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const saveUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_STORAGE_KEY);
  };

  const refresh = async () => {
    setError("");
    try {
      const rows = await api.listRequests();
      setRequests(rows);
      return rows;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    const onHashChange = () => {
      setGuestView(readGuestView());
      setUserView(readUserView());
    };
    window.addEventListener("hashchange", onHashChange);

    api.me()
      .then((currentUser) => {
        saveUser(currentUser);
        return api.listRequests();
      })
      .then((rows) => setRequests(rows))
      .catch((err) => {
        saveUser(null);
        setRequests([]);
        if (err.status !== 401) setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const onLogin = async (loggedInUser) => {
    saveUser(loggedInUser);
    window.location.hash = "#/workspace/dashboard";
    try {
      await refresh();
    } catch {
      // The dashboard displays the API error without discarding a valid session.
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      saveUser(null);
      setRequests([]);
      setError("");
      window.location.hash = "#/auth";
    }
  };

  const panel = useMemo(() => {
    if (!user) return null;
    if (user.role === "user" && userView === "profile") {
      return <UserProfilePage onProfileSaved={(profileUser) => saveUser({ ...user, ...profileUser })} />;
    }
    if (user.role === "admin") return <AdminDashboard requests={requests} refresh={refresh} activeView={userView} />;
    if (user.role === "collector") return <CollectorDashboard requests={requests} refresh={refresh} activeView={userView} />;
    return <UserDashboard requests={requests} refresh={refresh} activeView={userView} />;
  }, [user, requests, userView]);

  if (loading) {
    return <><BackgroundShapes /><div className="loading"><span className="loader-mark">{"♻"}</span><strong>Preparing your dashboard</strong><small>One greener moment...</small></div></>;
  }

  if (!user) {
    return <><BackgroundShapes />{guestView === "auth" ? <AuthPage onLogin={onLogin} onBack={() => (window.location.hash = "#/welcome")} /> : <WelcomePage onGetStarted={() => (window.location.hash = "#/auth")} />}</>;
  }

  const navByRole = {
    user: [["\u2302", "Dashboard", "dashboard"], ["+", "New Pickup Request", "new-request"], ["\u25A4", "My Requests", "requests"], ["\u25CB", "Profile", "profile"]],
    admin: [["\u2302", "Dashboard", "dashboard"], ["\u25A4", "Manage Requests", "manage-requests"], ["\u25CB", "Users", "users"], ["\u2659", "Collectors", "collectors"], ["\u25A5", "Reports", "reports"], ["\u2301", "Analytics", "analytics"]],
    collector: [["\u2302", "Dashboard", "dashboard"], ["\u25A4", "Assigned Tasks", "assigned-tasks"], ["\u2713", "Completed Tasks", "completed-tasks"]]
  };
  const navItems = navByRole[user.role] || navByRole.user;
  const displayName = user.first_name || user.username || "User";

  return (
    <div className={`dashboard-shell app-${user.role}`}>
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><BrandMark /><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">{"×"}</button></div>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navItems.map(([icon, label, view], index) => (
            <button key={label} type="button" className={(view ? userView === view : index === 0 && userView === "dashboard") ? "active" : ""} onClick={() => { if (view) window.location.hash = `#/workspace/${view}`; else if (index === 0) window.location.hash = "#/workspace/dashboard"; setSidebarOpen(false); }}><span>{icon}</span>{label}{label === "Notifications" ? <b>3</b> : null}</button>
          ))}
        </nav>
        <div className="sidebar-impact"><span>{"♻"}</span><strong>Your impact matters</strong><p>Together we're building a cleaner, circular future.</p><div><i style={{ width: "72%" }} /></div><small>72% monthly goal</small></div>
        <button className="sidebar-logout" type="button" onClick={logout}><span>{"↪"}</span> Log out</button>
        <div className="sidebar-user"><span>{displayName.slice(0, 2).toUpperCase()}</span><div><strong>{displayName}</strong><small>{user.role} account</small></div><b>...</b></div>
      </aside>
      {sidebarOpen ? <button className="sidebar-scrim" aria-label="Close navigation" type="button" onClick={() => setSidebarOpen(false)} /> : null}
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="mobile-brand"><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">{"☰"}</button><BrandMark /></div>
          <label className="dashboard-search"><span>{"⌕"}</span><input aria-label="Search" placeholder="Search requests, users, collectors..." /><kbd>Ctrl K</kbd></label>
          <div className="dashboard-actions">{user.role !== "collector" ? <button type="button" aria-label="Notifications">{"♢"}<b>3</b></button> : null}<div className="topbar-user"><span>{displayName.slice(0, 2).toUpperCase()}</span><div><strong>{displayName}</strong><small>{user.role}</small></div><b>{"⌄"}</b></div></div>
        </header>
        <div className="dashboard-content">
          <div className="dashboard-welcome"><div><p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h1>Good day, {displayName}</h1><small>Here's what's happening with your e-waste journey.</small></div>{user.role === "user" ? <button type="button" onClick={() => { window.location.hash = "#/workspace/new-request"; }}>+ New pickup request</button> : null}</div>
          {error ? <p className="error message-box">{error}</p> : null}
          {panel}
        </div>
      </main>
    </div>
  );
}
