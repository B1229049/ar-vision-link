import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("currentUser"))
  );
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(user);

    const checkAdmin = async () => {
      if (!user || !user.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/api/admin/users");
        const data = await res.json();

        if (res.ok && data.success) {
          const matchedUser = (data.users || []).find(
            (item) => String(item.id) === String(user.id)
          );

          setIsAdmin(!!matchedUser?.admin);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("檢查 admin 身分失敗:", error);
        setIsAdmin(false);
      }
    };

    checkAdmin();

    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem("currentUser"));
      setCurrentUser(updatedUser);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function logout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setIsAdmin(false);
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

            {isAdmin && (
              <button onClick={() => go("/admin")}>
                管理後台
              </button>
            )}

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