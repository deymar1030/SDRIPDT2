import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import ComoFunciona from "./pages/ComoFunciona";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientNew from "./pages/PatientNew";
import PatientDetail from "./pages/PatientDetail";
import Simulator from "./pages/Simulator";
import Perfil from "./pages/Perfil";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/como-funciona" element={<ComoFunciona />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          {/* Con sesión */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pacientes" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/pacientes/nuevo" element={<ProtectedRoute><PatientNew /></ProtectedRoute>} />
          <Route path="/pacientes/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
          <Route path="/simulador" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
