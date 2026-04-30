import { useState, useEffect } from "react";
import "./styles/global.css";
import api from "./components/layout/api";

import Navbar from "./components/layout/Navbar/Navbar";
import Sidebar from "./components/layout/Sidebar/Sidebar";
import UpgradeModal from "./components/layout/UpgradeModal/UpgradeModal";
import AuthModal from "./components/layout/AuthModal/AuthModal";

import DashboardPage from "./components/pages/free/DashboardPage/DashboardPage";
import MyNotesPage from "./components/pages/free/MyNotesPage/MyNotesPage";
import UploadNotesPage from "./components/pages/free/UploadNotesPage/UploadNotesPage";
import ExamShell from "./components/pages/exam/ExamShell/ExamShell";
import AdminDashboard from "./components/pages/free/AdminDashboard/Admin/AdminDashboard";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [isPremium, setIsPremium] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inExamMode, setInExamMode] = useState(false);
  const [inAdminMode, setInAdminMode] = useState(false); 
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);

  const handleNavClick = key => {

    if (key === "admin") {
      if (user?.role !== "admin") {
        alert("Access denied");
        return;
      }
      setInAdminMode(true);
      return;
    }

    setInAdminMode(false);

    if (key === "exam-mode") {
      if (!isPremium) { handleUpgradeClick(); return; }
      setInExamMode(true);
      return;
    }

    setPage(key);
  };

  const handleUploadAuth = () => setAuthMode("signup");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/api/auth/itsMe");
        setUser(res.data.user);
        setIsPremium(res.data.user.plan === "premium");
      } catch (error) {
        setUser(null);
        setIsPremium(false);
      }
    }
    checkAuth();
  }, []);

  const handleUpgrade = async () => {
    try {
      const res = await api.post("/api/auth/upgrade");
      setIsPremium(true);
      setShowModal(false);
      setUser(prev => ({
        ...prev,
        plan: "premium",
        planExpiresAt: res.data.expiresAt
      }));
    } catch (error) {
      if (error.response?.status === 401) {
        setAuthMode("login");
      } else {
        alert("Upgrade failed");
      }
    }
  };

  const handleUpgradeClick = () => {
    if (!user) { setShowModal(false); setAuthMode("signup"); return; }
    setShowModal(true);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsPremium(userData.plan === "premium");
    setAuthMode(null);
  };

  const handleLogOut = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.log("Logout failed", err);
    }
    finally {
      setUser(null);
      setIsPremium(false);
      setInExamMode(false);
      setInAdminMode(false); // ✅ reset
      setPage("dashboard");
    }
  };

  //  EXAM MODE (already correct)
  if (inExamMode) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#f6f7fb", zIndex: 200, overflowY: "auto" }}>
        <ExamShell onExit={() => setInExamMode(false)} user={user} />
      </div>
    );
  }

  //  ADMIN MODE (FIXED)
  if (inAdminMode) {
    if (user?.role !== "admin") {
      return <div>Unauthorized</div>;
    }
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "#0f172a",
        zIndex: 99999,
        overflowY: "auto",
        isolation: "isolate"
      }}>
        <AdminDashboard onExit={() => setInAdminMode(false)} />
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "my-notes": return <MyNotesPage isPremium={isPremium} onUpgrade={handleUpgradeClick} />;
      case "upload-notes": return <UploadNotesPage isPremium={isPremium} onUpgrade={handleUpgradeClick} user={user} onAuthRequired={handleUploadAuth} />;
      default: return <DashboardPage isPremium={isPremium} onUpgrade={handleUpgradeClick} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar
        isPremium={isPremium}
        user={user}
        onSignUp={() => setAuthMode("signup")}
        onLogIn={() => setAuthMode("login")}
        onLogOut={handleLogOut}
      />

      <div style={{ display: "flex", paddingTop: 58 }}>
        <Sidebar
          page={page}
          onNav={handleNavClick}
          onUpgrade={handleUpgradeClick}
          isPremium={isPremium}
          isAdmin={user?.role === "admin"}
        />
        <main style={{ marginLeft: 240, flex: 1, minHeight: "calc(100vh - 58px)" }}>
          {renderPage()}
        </main>
      </div>

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {showModal && (
        <UpgradeModal onClose={() => setShowModal(false)} onUpgrade={handleUpgrade} />
      )}
    </div>
  );
}