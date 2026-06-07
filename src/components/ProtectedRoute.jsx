// "Gardien" de route : empêche d'accéder à une page sans le bon rôle.
//   - Pas connecté        -> renvoyé vers la page de connexion.
//   - Mauvais rôle        -> renvoyé vers son propre espace.
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function ProtectedRoute({ role, children }) {
  const { loading, isAuthenticated, role: currentRole } = useAuth();

  if (loading) return <Spinner />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Connecté mais avec le mauvais rôle : on le renvoie chez lui.
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === "admin" ? "/admin" : "/tech"} replace />;
  }

  return children;
}
