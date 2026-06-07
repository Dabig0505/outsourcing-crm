// Contexte d'authentification : gère QUI est connecté et son rôle.
//
// Particularité du projet : pas de compte email/mot de passe, pas de Firebase Auth.
// On utilise une authentification "maison" par code PIN :
//   - L'admin a un PIN unique (défini à la première utilisation), stocké haché
//     dans le document config/app de Firestore.
//   - Chaque technicien a son propre PIN haché dans la collection "technicians".
//
// La session courante est mémorisée dans le navigateur (localStorage) pour ne pas
// avoir à se reconnecter à chaque rafraîchissement.
import { createContext, useContext, useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";
import { hashPin, verifyPin } from "../utils/pin";

const AuthContext = createContext(null);

// Document unique de configuration de l'entreprise (PIN admin + infos PDF).
const CONFIG_DOC = doc(db, COLLECTIONS.config, "app");
const SESSION_KEY = "osc_session"; // clé de stockage de la session dans le navigateur

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { role, technicianId?, nom? }
  const [adminConfigured, setAdminConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  // Au démarrage : on restaure la session et on vérifie si l'admin est déjà configuré.
  useEffect(() => {
    async function init() {
      // 1. Restaurer la session précédente depuis le navigateur.
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) setSession(JSON.parse(saved));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }

      // 2. Vérifier si un PIN admin existe déjà.
      try {
        const snap = await getDoc(CONFIG_DOC);
        setAdminConfigured(snap.exists() && !!snap.data().adminPinHash);
      } catch (e) {
        console.error("Lecture de la config impossible :", e);
      }

      setLoading(false);
    }
    init();
  }, []);

  function persist(newSession) {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  // Première utilisation : l'admin définit son PIN. On crée le document config/app.
  async function setupAdmin(pin) {
    await setDoc(
      CONFIG_DOC,
      {
        adminPinHash: hashPin(pin),
        entreprise: {
          nom: "Outsourcing Support",
          adresse: "",
          telephone: "",
          email: "",
          logo: "",
        },
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    setAdminConfigured(true);
    persist({ role: "admin" });
  }

  // Connexion admin : on compare le PIN saisi au hash stocké.
  async function loginAdmin(pin) {
    const snap = await getDoc(CONFIG_DOC);
    if (!snap.exists() || !snap.data().adminPinHash) {
      throw new Error("Aucun administrateur configuré.");
    }
    if (!verifyPin(pin, snap.data().adminPinHash)) {
      throw new Error("Code PIN administrateur incorrect.");
    }
    persist({ role: "admin" });
  }

  // Connexion technicien : on récupère sa fiche et on compare le PIN.
  async function loginTechnician(technicianId, pin) {
    const snap = await getDoc(doc(db, COLLECTIONS.technicians, technicianId));
    if (!snap.exists()) throw new Error("Technicien introuvable.");
    const tech = snap.data();
    if (tech.actif === false) throw new Error("Ce compte technicien est désactivé.");
    if (!verifyPin(pin, tech.pinHash)) throw new Error("Code PIN incorrect.");
    persist({ role: "technician", technicianId, nom: tech.nom });
  }

  function logout() {
    persist(null);
  }

  const value = {
    session,
    role: session?.role ?? null,
    isAuthenticated: !!session,
    adminConfigured,
    loading,
    setupAdmin,
    loginAdmin,
    loginTechnician,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Petit raccourci pour utiliser le contexte dans n'importe quel composant.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  return ctx;
}
