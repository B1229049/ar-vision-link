import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  let currentUser = null;

  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    localStorage.removeItem("currentUser");
  }

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
  }

  function go(path) {
    navigate(path);
  }

  return (
    <nav className={`navbar ${currentUser ? "is-authenticated" : "is-guest"}`}>
      <div className="nav-logo" onClick={() => go("/")}>
        AR Vision Link
      </div>

      <div className="nav-links">
        {currentUser && <button className="nav-home" onClick={() => go("/")}>主頁</button>}

        {!currentUser && (
          <>
            <button className="nav-login" onClick={() => go("/face-login")}>登入</button>
            <button className="nav-register" onClick={() => go("/register")}>註冊</button>
          </>
        )}

        {currentUser && (
          <>
            <button className="nav-quiz" onClick={() => go("/quiz")}>Quiz</button>
            <button className="nav-camera" onClick={() => go("/camera")}>ARcamera</button>
            <button className="nav-profile" onClick={() => go("/profile")}>個人頁面</button>

            {/* for adminer */}
            {currentUser.admin === true && (
              <button onClick={() => go("/admin")}>管理員</button>
              )}
              <button className="logout nav-logout" onClick={logout}>登出</button>

          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
