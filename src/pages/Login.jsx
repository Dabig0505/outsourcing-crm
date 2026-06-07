// Écran de connexion (mobile-first).
// Trois situations gérées automatiquement :
//   1. Première utilisation : aucun PIN admin -> écran de création du code admin.
//   2. Connexion technicien : choisir son nom dans la liste + saisir son PIN.
//   3. Connexion admin : saisir le code admin.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";
import { useAuth } from "../context/AuthContext";
import { isValidPin } from "../utils/pin";
import Spinner from "../components/Spinner";

export default function Login() {
  const { loading, adminConfigured, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  // Si déjà connecté, on redirige vers le bon espace.
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(role === "admin" ? "/admin" : "/tech", { replace: true });
    }
  }, [loading, isAuthenticated, role, navigate]);

  if (loading) return <Spinner />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">Outsourcing Support</h1>
          <p className="text-sm text-slate-500">Gestion des interventions</p>
        </div>
        {adminConfigured ? <LoginForms /> : <AdminSetupForm />}
      </div>
    </div>
  );
}

// ── Première utilisation : création du code admin ───────────────────────────
function AdminSetupForm() {
  const { setupAdmin } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isValidPin(pin)) return setError("Le code doit comporter 4 à 6 chiffres.");
    if (pin !== confirm) return setError("Les deux codes ne correspondent pas.");
    setBusy(true);
    try {
      await setupAdmin(pin);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Première utilisation.</strong> Définissez votre code administrateur
        (4 à 6 chiffres). Notez-le : il vous servira à chaque connexion.
      </div>
      <PinField label="Code administrateur" value={pin} onChange={setPin} autoFocus />
      <PinField label="Confirmez le code" value={confirm} onChange={setConfirm} />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <SubmitButton busy={busy}>Créer le code admin</SubmitButton>
    </form>
  );
}

// ── Connexion normale : onglets Technicien / Admin ──────────────────────────
function LoginForms() {
  const [tab, setTab] = useState("technician");

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <TabButton active={tab === "technician"} onClick={() => setTab("technician")}>
          Technicien
        </TabButton>
        <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>
          Admin
        </TabButton>
      </div>
      {tab === "technician" ? <TechnicianLogin /> : <AdminLogin />}
    </div>
  );
}

function TechnicianLogin() {
  const { loginTechnician } = useAuth();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Charger la liste des techniciens actifs.
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.technicians));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => t.actif !== false)
          .sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
        setTechnicians(list);
      } catch (e) {
        console.error(e);
        setTechnicians([]);
        setError("Impossible de charger la liste des techniciens.");
      }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!selectedId) return setError("Sélectionnez votre nom.");
    if (!isValidPin(pin)) return setError("Le code doit comporter 4 à 6 chiffres.");
    setBusy(true);
    try {
      await loginTechnician(selectedId, pin);
      navigate("/tech", { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
      setBusy(false);
    }
  }

  if (technicians === null) {
    return <p className="py-4 text-center text-sm text-slate-500">Chargement…</p>;
  }

  if (technicians.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        Aucun technicien n'a encore été créé. L'administrateur doit en ajouter
        depuis son espace.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Votre nom
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:border-slate-500 focus:outline-none"
        >
          <option value="">— Sélectionnez —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
      </div>
      <PinField label="Votre code PIN" value={pin} onChange={setPin} />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <SubmitButton busy={busy}>Se connecter</SubmitButton>
    </form>
  );
}

function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isValidPin(pin)) return setError("Le code doit comporter 4 à 6 chiffres.");
    setBusy(true);
    try {
      await loginAdmin(pin);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PinField label="Code administrateur" value={pin} onChange={setPin} autoFocus />
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <SubmitButton busy={busy}>Se connecter</SubmitButton>
    </form>
  );
}

// ── Petits composants réutilisables de l'écran ──────────────────────────────
function PinField({ label, value, onChange, autoFocus }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="••••"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-widest text-slate-800 focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-2 text-sm font-medium transition ${
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-lg bg-slate-800 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
    >
      {busy ? "Veuillez patienter…" : children}
    </button>
  );
}

function ErrorMsg({ children }) {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
  );
}
