import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser) {
    return <Navigate to="/face-login" replace />;
  }

  if (currentUser.admin !== true) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;