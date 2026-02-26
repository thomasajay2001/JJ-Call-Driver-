import React, { useState } from "react";
import LoginTab   from "./components/tabs/LoginTab";
import HomeTab    from "./components/home/HomeTab";
import RideTab    from "./components/tabs/RideTab";
import ProfileTab from "./components/tabs/ProfileTab";

/* ═══════════════════════════════════════════
   App — Root with bottom tab navigation
   Default: always opens LoginTab
   ═══════════════════════════════════════════ */
const TABS = [
  { id: "home",    label: "Home",    icon: "🏠" },
  { id: "ride",    label: "Ride",    icon: "🚕" },
  { id: "profile", label: "Profile", icon: "👤" },
];

const App = () => {
  // ✅ Always start on login — no localStorage auto-login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab,  setActiveTab]  = useState("home");

  const handleLogin = () => {
    setIsLoggedIn(true);
    setActiveTab("home");
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setActiveTab("home");
  };

  // ✅ Always show LoginTab until user logs in
  if (!isLoggedIn) return <LoginTab onLogin={handleLogin} />;

  return (
    <div style={styles.appShell}>
      {/* ── Global CSS ── */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
      `}</style>

      {/* ── Page content ── */}
      <main style={styles.main}>
        {activeTab === "home"    && <HomeTab />}
        {activeTab === "ride"    && <RideTab />}
        {activeTab === "profile" && (
          <div>
            <ProfileTab />
            <div style={styles.logoutWrap}>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav style={styles.bottomNav}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              <span style={{ ...styles.tabLabel, ...(active ? styles.tabLabelActive : {}) }}>
                {tab.label}
              </span>
              {active && <div style={styles.activeDot} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default App;

const styles = {
  appShell: {
    display:         "flex",
    flexDirection:   "column",
    height:          "100vh",
    maxWidth:        480,
    margin:          "0 auto",
    position:        "relative",
    backgroundColor: "#F8FAFC",
    boxShadow:       "0 0 40px rgba(0,0,0,0.12)",
  },
  main: {
    flex:       1,
    overflowY:  "auto",
    paddingBottom: 72,
  },
  bottomNav: {
    position:        "fixed",
    bottom:          0,
    left:            "50%",
    transform:       "translateX(-50%)",
    width:           "100%",
    maxWidth:        480,
    display:         "flex",
    backgroundColor: "#fff",
    borderTop:       "1px solid #E2E8F0",
    boxShadow:       "0 -4px 16px rgba(0,0,0,0.08)",
    zIndex:          100,
  },
  tabBtn: {
    flex:           1,
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "10px 0 8px",
    background:     "none",
    border:         "none",
    cursor:         "pointer",
    position:       "relative",
    gap:            3,
    transition:     "background 0.15s",
  },
  tabBtnActive:  { backgroundColor: "#F0F7FF" },
  tabIcon:       { fontSize: 22 },
  tabLabel: {
    fontSize:   11,
    fontWeight: 600,
    color:      "#94A3B8",
    transition: "color 0.2s",
  },
  tabLabelActive: { color: "#2563EB" },
  activeDot: {
    position:        "absolute",
    top:             0,
    left:            "50%",
    transform:       "translateX(-50%)",
    width:           28,
    height:          3,
    backgroundColor: "#2563EB",
    borderRadius:    "0 0 4px 4px",
  },
  logoutWrap: { padding: "0 16px 32px" },
  logoutBtn: {
    width:           "100%",
    padding:         "14px 0",
    backgroundColor: "#FEE2E2",
    border:          "none",
    borderRadius:    16,
    fontSize:        15,
    fontWeight:      700,
    color:           "#DC2626",
    cursor:          "pointer",
  },
};