// Point d'entrée de l'interface : définit les routes (pages) et qui peut y accéder.
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { seedDefaultTemplatesOnce } from "./services/seedTemplates";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminLayout from "./components/admin/AdminLayout";
import TechniciansPage from "./pages/admin/TechniciansPage";
import ClientsPage from "./pages/admin/ClientsPage";
import TaskTemplatesPage from "./pages/admin/TaskTemplatesPage";
import ContractsPage from "./pages/admin/ContractsPage";
import HistoryPage from "./pages/admin/HistoryPage";
import SettingsPage from "./pages/admin/SettingsPage";
import TechHome from "./pages/technician/TechHome";
import InterventionForm from "./pages/technician/InterventionForm";

function App() {
  // Au tout premier lancement, on pré-remplit la base avec les modèles par défaut.
  // S'exécute une seule fois (drapeau dans Firestore) et n'écrase jamais l'existant.
  useEffect(() => {
    seedDefaultTemplatesOnce().catch((e) =>
      console.error("Pré-remplissage des modèles impossible :", e)
    );
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Espace administrateur (PC) : barre latérale + sections imbriquées. */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="techniciens" replace />} />
              <Route path="techniciens" element={<TechniciansPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="modeles" element={<TaskTemplatesPage />} />
              <Route path="contrats" element={<ContractsPage />} />
              <Route path="historique" element={<HistoryPage />} />
              <Route path="parametres" element={<SettingsPage />} />
            </Route>

            {/* Espace technicien (mobile). */}
            <Route
              path="/tech"
              element={
                <ProtectedRoute role="technician">
                  <TechHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tech/intervention/:id"
              element={
                <ProtectedRoute role="technician">
                  <InterventionForm />
                </ProtectedRoute>
              }
            />

            {/* Toute autre adresse renvoie vers la connexion. */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
