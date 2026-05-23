import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  function logout() {
    localStorage.removeItem("currentUser");
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => navigate("/")}>
        AR Vision Link
      </div>

      <div className="nav-links">
        <button onClick={() => navigate("/")}>首頁</button>

        {!currentUser && (
          <>
            <button onClick={() => navigate("/register")}>註冊</button>
            <button onClick={() => navigate("/face-login")}>臉部登入</button>
          </>
        )}

        {currentUser && (
          <>
            <button onClick={() => navigate("/profile")}>個人頁面</button>
            <button onClick={() => navigate("/camera")}>AR Camera</button>
            <button className="logout" onClick={logout}>登出</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;