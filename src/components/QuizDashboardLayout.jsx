import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "../styles/QuizDashboardLayout.css";

function SidebarIcon({ name }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "overview") {
    return <svg {...shared}><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>;
  }

  if (name === "quizzes") {
    return <svg {...shared}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
  }

  if (name === "history") {
    return <svg {...shared}><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" /></svg>;
  }

  return <svg {...shared}><path d="M12 5v14M5 12h14" /></svg>;
}

function QuizDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isOverview = location.pathname === "/quiz";
  const isManage = location.pathname.startsWith("/quiz/manage");
  const isHistory = location.pathname.startsWith("/quiz/history");
  const isHost = location.pathname.startsWith("/quiz/host");

  return (
    <div className="quiz-dashboard-layout">
      <div className="quiz-dashboard-layout-shell">
        <aside className="quiz-dashboard-sidebar" aria-label="Quiz Center 功能導覽">
          <button
            type="button"
            className="quiz-dashboard-title"
            onClick={() => navigate("/quiz")}
          >
            Quiz Center
          </button>

          <div className="quiz-sidebar-label">Workspace</div>
          <nav className="quiz-sidebar-nav">
            <button
              type="button"
              className={isOverview ? "active" : ""}
              aria-current={isOverview ? "page" : undefined}
              onClick={() => navigate("/quiz")}
            >
              <SidebarIcon name="overview" />
              <span>總覽</span>
            </button>
            <button
              type="button"
              className={isManage ? "active" : ""}
              aria-current={isManage ? "page" : undefined}
              onClick={() => navigate("/quiz/manage")}
            >
              <SidebarIcon name="quizzes" />
              <span>我的測驗</span>
            </button>
            <button
              type="button"
              className={isHistory ? "active" : ""}
              aria-current={isHistory ? "page" : undefined}
              onClick={() => navigate("/quiz/history")}
            >
              <SidebarIcon name="history" />
              <span>歷史紀錄</span>
            </button>
          </nav>

          <nav className="quiz-sidebar-nav quiz-sidebar-room-action">
            <button
              type="button"
              className={isHost ? "active" : ""}
              aria-current={isHost ? "page" : undefined}
              onClick={() => navigate("/quiz/host")}
            >
              <SidebarIcon name="add" />
              <span>建立房間</span>
            </button>
          </nav>
        </aside>

        <div className="quiz-dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default QuizDashboardLayout;
