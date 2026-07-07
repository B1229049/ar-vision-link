import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const currentUser = localStorage.getItem("currentUser");

  if (!currentUser) {
    localStorage.setItem(
      "pendingRedirect",
      `${location.pathname}${location.search}`
    );

    return <Navigate to="/face-login" replace />;
  }

  return children;
}

export default ProtectedRoute;
