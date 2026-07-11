import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { USER_STORAGE_KEY } from "./constants";
import AuthPage from "./pages/AuthPage";
import WelcomePage from "./pages/WelcomePage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CollectorDashboard from "./pages/CollectorDashboard";
import BackgroundShapes from "./components/BackgroundShapes";
import UserProfilePage from "./pages/UserProfilePage";

export default function App() {
  const readGuestView = () => {
    const hash = (window.location.hash || "").toLowerCase();
    return hash === "#/auth" ? "auth" : "welcome";
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
  const [userView, setUserView] = useState("dashboard");

  const saveUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const refresh = async () => {
    try {
      const rows = await api.listRequests();
      setRequests(rows);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const onHashChange = () => setGuestView(readGuestView());
    window.addEventListener("hashchange", onHashChange);

    api.me()
      .then((currentUser) => {
        saveUser(currentUser);
        return api.listRequests();
      })
      .then((rows) => setRequests(rows))
      .catch((err) => {
        if (err.status === 401) {
          saveUser(null);
          setRequests([]);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const onLogin = async (loggedInUser) => {
    saveUser(loggedInUser);
    setUserView("dashboard");
    await refresh();
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      saveUser(null);
      setRequests([]);
    }
  };

  const panel = useMemo(() => {
    if (!user) return null;
    if (user.role === "user" && userView === "profile") {
      return <UserProfilePage onProfileSaved={(profileUser) => saveUser({ ...user, ...profileUser })} />;
    }
    if (user.role === "admin") return <AdminDashboard requests={requests} refresh={refresh} />;
    if (user.role === "collector") return <CollectorDashboard requests={requests} refresh={refresh} />;
    return <UserDashboard requests={requests} refresh={refresh} />;
  }, [user, requests, userView]);

  if (loading) {
    return (
      <>
        <BackgroundShapes />
        <div className="loading">Loading...</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <BackgroundShapes />
        {guestView === "auth" ? (
          <AuthPage onLogin={onLogin} onBack={() => (window.location.hash = "#/welcome")} />
        ) : (
          <WelcomePage onGetStarted={() => (window.location.hash = "#/auth")} />
        )}
      </>
    );
  }

  return (
    <>
      <BackgroundShapes />
      <main className={`app app-${user.role}`}>
        <header className="topbar card">
          <div className="title-block">
            <h1>Smart E-Waste Collection</h1>
            <p>
              Signed in as <strong>{user.username}</strong> ({user.role})
            </p>
            <span className={`role-chip role-chip-${user.role}`}>{user.role}</span>
          </div>
          <div className="topbar-actions">
            {user.role === "user" ? (
              <>
                <button
                  className={`ghost-btn ${userView === "dashboard" ? "active-view-btn" : ""}`}
                  type="button"
                  onClick={() => setUserView("dashboard")}
                >
                  Dashboard
                </button>
                <button
                  className={`ghost-btn ${userView === "profile" ? "active-view-btn" : ""}`}
                  type="button"
                  onClick={() => setUserView("profile")}
                >
                  Profile
                </button>
              </>
            ) : null}
            <button className="ghost-btn logout-btn" type="button" onClick={logout}>
              Log Out
            </button>
          </div>
        </header>
        {error ? <p className="error">{error}</p> : null}
        {panel}
      </main>
    </>
  );
}
