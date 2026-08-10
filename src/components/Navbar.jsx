import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
  }

  function go(path) {
    navigate(path);
  }

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => go("/")}>
        AR Vision Link
      </div>

      <div className="nav-links">
        <button className="nav-home" onClick={() => go("/")}>主頁</button>

        {!currentUser && (
          <>
            <button onClick={() => go("/register")}>註冊</button>
            <button onClick={() => go("/face-login")}>登入</button>
          </>
        )}

        {currentUser && (
          <>
            <button className="nav-quiz" onClick={() => go("/quiz")}>Quiz</button>
            <button className="nav-camera" onClick={() => go("/camera")}>ARcamera</button>
            <button className="nav-profile" onClick={() => go("/profile")}>個人頁面</button>
            <button className="logout nav-logout" onClick={logout}>登出</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
