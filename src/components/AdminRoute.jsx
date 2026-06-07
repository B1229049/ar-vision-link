import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));

      if (!currentUser || !currentUser.id) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/api/admin/users");
        const data = await res.json();

        if (res.ok && data.success) {
          const matchedUser = (data.users || []).find(
            (item) => String(item.id) === String(currentUser.id)
          );

          setIsAdmin(!!matchedUser?.admin);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("檢查 admin 權限失敗:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem" }}>權限檢查中...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;