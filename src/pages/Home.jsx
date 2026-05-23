import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <div className="page">
      <div className="container">

        <h1>Web AR Project</h1>

        <Link to="/camera">📷 Camera Test</Link>

        <Link to="/register">📝 Register</Link>

        <Link to="/face-login">🔗 Login</Link>

        <Link to="/create">📅 創建會議</Link>

        <Link to="/join">🔗 加入會議</Link>

      </div>
    </div>
  );
}

export default Home;