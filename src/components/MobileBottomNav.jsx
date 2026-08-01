import { useLocation, useNavigate } from "react-router-dom";
import "../styles/MobileBottomNav.css";

const items = [
  { label: "首頁", path: "/", icon: "home" },
  { label: "Quiz Center", path: "/quiz", icon: "quiz" },
  { label: "信件", icon: "mail" },
  { label: "個人頁面", path: "/profile", icon: "profile" },
];

function Icon({ name }) {
  const shared = {
    width: "23", height: "23", viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round",
    strokeLinejoin: "round", "aria-hidden": true,
  };

  if (name === "home") return <svg {...shared}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-7h6v7" /></svg>;
  if (name === "quiz") return <svg {...shared}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 9h.01M16 9h.01M8 15h.01M16 15h.01" /></svg>;
  if (name === "mail") return <svg {...shared}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
  return <svg {...shared}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="mobile-bottom-nav" aria-label="手機版主要導覽">
      {items.map((item) => {
        const isActive = item.path && (item.path === "/"
          ? location.pathname === "/"
          : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));

        return (
          <button key={item.label} type="button" className={isActive ? "active" : ""} onClick={() => item.path && navigate(item.path)} aria-label={item.label} aria-current={isActive ? "page" : undefined}>
            <Icon name={item.icon} />
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
