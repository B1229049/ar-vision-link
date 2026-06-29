import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
    setMenuOpen(false);
  }

  function go(path) {
    navigate(path);
    setMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => go("/")}>
        AR Vision Link
      </div>

      {/* 手機版漢堡選單 */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <div className={`nav-links ${menuOpen ? "active" : ""}`}>
        <button onClick={() => go("/")}>首頁</button>

        {!currentUser && (
          <>
            <button onClick={() => go("/register")}>註冊</button>
            <button onClick={() => go("/face-login")}>登入</button>
          </>
        )}

        {currentUser && (
          <>
            <button onClick={() => go("/profile")}>個人頁面</button>

            <button onClick={() => go("/camera")}>
              AR Camera
            </button>

            <button onClick={() => go("/quiz")}>
              Quiz
            </button>

            <button
              className="logout"
              onClick={logout}
            >
              登出
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;