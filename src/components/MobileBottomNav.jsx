import { useLocation, useNavigate } from "react-router-dom";
import "../styles/MobileBottomNav.css";

const items = [
  { label: "Home", path: "/", icon: "home" },
  { label: "Quiz", path: "/quiz", icon: "quiz" },
  { label: "ARcamera", path: "/camera", icon: "camera" },
  { label: "Me", path: "/profile", icon: "profile" },
];

function Icon({ name }) {
  const shared = {
    width: "23",
    height: "23",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...shared}>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    );
  }

  if (name === "quiz") {
    return (
      <svg {...shared}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3v3M15 3v3M9 11l2 2 4-4M9 17h6" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...shared}>
        <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="14" r="3.5" />
      </svg>
    );
  }

  if (name === "admin") {
    return (
      <svg {...shared}>
        <path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  if (!currentUser || location.pathname === "/ar-selfie") {
    return null;
  }

  const navItems = [...items];

  if (currentUser.admin === true) {
    navItems.push({
      label: "管理員",
      path: "/admin",
      icon: "admin",
    });
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="手機版主要導覽">
      {navItems.map((item) => {
        const isActive =
          item.path &&
          (item.path === "/"
            ? location.pathname === "/"
            : location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`));

        return (
          <button
            key={item.label}
            type="button"
            className={isActive ? "active" : ""}
            onClick={() => item.path && navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span className="mobile-bottom-nav-label">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;