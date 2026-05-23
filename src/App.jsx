import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Camera from "./pages/Camera";
import FaceLogin from "./pages/FaceLogin";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ReRegisterFace from "./pages/ReRegisterFace";

import QuizHome from "./pages/QuizHome";
import CreateQuiz from "./pages/CreateQuiz";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    
    <BrowserRouter basename="/ar-vision-link">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/face-login" element={<FaceLogin />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/camera"
          element={
            <ProtectedRoute>
              <Camera />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/re-register-face"
          element={
            <ProtectedRoute>
              <ReRegisterFace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <QuizHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz/create"
          element={
            <ProtectedRoute>
              <CreateQuiz />
            </ProtectedRoute>
          }
        />
      </Routes>

      
    </BrowserRouter>
  );
}

export default App;