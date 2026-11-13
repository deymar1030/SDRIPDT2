import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import ComoFunciona from "./pages/ComoFunciona";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientNew from "./pages/PatientNew";
import PatientDetail from "./pages/PatientDetail";
import Simulator from "./pages/Simulator";
import Perfil from "./pages/Perfil";
import Usuarios from "./pages/Usuarios";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas (no hay registro: las cuentas las crea un admin) */}
          <Route path="/" element={<Landing />} />
          <Route path="/como-funciona" element={<ComoFunciona />} />
          <Route path="/login" element={<Login />} />

          {/* Médico: sus pacientes y simulaciones */}
          <Route path="/dashboard" element={<ProtectedRoute roles={["medico"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/pacientes" element={<ProtectedRoute roles={["medico"]}><Patients /></ProtectedRoute>} />
          <Route path="/pacientes/nuevo" element={<ProtectedRoute roles={["medico"]}><PatientNew /></ProtectedRoute>} />
          <Route path="/pacientes/:id" element={<ProtectedRoute roles={["medico"]}><PatientDetail /></ProtectedRoute>} />
          <Route path="/simulador" element={<ProtectedRoute roles={["medico"]}><Simulator /></ProtectedRoute>} />

          {/* Admin: gestión de cuentas (no ve pacientes) */}
          <Route path="/usuarios" element={<ProtectedRoute roles={["admin"]}><Usuarios /></ProtectedRoute>} />

          {/* Ambos */}
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
