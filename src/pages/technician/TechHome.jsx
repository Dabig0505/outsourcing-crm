// Espace technicien (mobile-first). Deux vues :
//   - "À venir"  : toutes les interventions à faire (tous techniciens), triées par date.
//   - "Passées"  : uniquement celles que CE technicien a soumises, plus récentes d'abord.
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { listUpcoming, listPastByTechnician } from "../../services/interventions";
import { listClients } from "../../services/clients";
import { listTechnicians } from "../../services/technicians";
import { formatDateFR } from "../../utils/recurrence";
import { useAuth } from "../../context/AuthContext";

export default function TechHome() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // On peut arriver ici en demandant un onglet précis (ex : "past" après création).
  const [tab, setTab] = useState(location.state?.tab === "past" ? "past" : "upcoming");

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-slate-800">Bonjour {session?.nom}</h1>
          <p className="text-xs text-slate-500">Mes interventions</p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 active:bg-slate-100"
        >
          Déconnexion
        </button>
      </header>

      {/* Onglets */}
      <div className="sticky top-[57px] z-10 grid grid-cols-2 gap-1 border-b border-slate-200 bg-white px-3 py-2">
        <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          À venir
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          Passées
        </TabButton>
      </div>

      <main className="mx-auto max-w-md p-3">
        {/* Action principale : créer une intervention faite sur le moment */}
        <button
          onClick={() => navigate("/tech/nouvelle")}
          className="mb-4 w-full rounded-2xl bg-slate-800 py-4 text-base font-semibold text-white shadow-sm active:bg-slate-700"
        >
          + Nouvelle intervention
        </button>

        {tab === "upcoming" ? (
          <UpcomingList />
        ) : (
          <PastList technicianId={session?.technicianId} />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg py-2.5 text-sm font-semibold transition ${
        active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

// ── Vue "À venir" ───────────────────────────────────────────────────────────
function UpcomingList() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, items: [], clients: {}, techs: {} });

  useEffect(() => {
    async function load() {
      try {
        const [items, clients, techs] = await Promise.all([
          listUpcoming(),
          listClients(),
          listTechnicians(),
        ]);
        const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
        setState({ loading: false, items, clients: byId(clients), techs: byId(techs) });
      } catch (e) {
        console.error(e);
        setState({ loading: false, items: [], clients: {}, techs: {}, error: true });
      }
    }
    load();
  }, []);

  if (state.loading) return <Loading />;
  if (state.error) return <Message>Erreur de chargement.</Message>;
  if (state.items.length === 0)
    return <Message>🎉 Aucune intervention à faire pour le moment.</Message>;

  return (
    <ul className="space-y-3">
      {state.items.map((it) => {
        const client = state.clients[it.clientId];
        const titulaire = it.technicianId ? state.techs[it.technicianId]?.nom : null;
        return (
          <li key={it.id}>
            <button
              onClick={() => navigate(`/tech/intervention/${it.id}`)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800">
                  {client?.nom || "Client inconnu"}
                </span>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  À faire
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">📅 {formatDateFR(it.date)}</div>
              <div className="mt-1 text-xs text-slate-400">
                Titulaire : {titulaire || "non défini"}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Vue "Passées" (du technicien connecté) ──────────────────────────────────
function PastList({ technicianId }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, items: [], clients: {} });

  useEffect(() => {
    async function load() {
      if (!technicianId) return setState({ loading: false, items: [], clients: {} });
      try {
        const [items, clients] = await Promise.all([
          listPastByTechnician(technicianId),
          listClients(),
        ]);
        const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
        setState({ loading: false, items, clients: byId(clients) });
      } catch (e) {
        console.error(e);
        setState({ loading: false, items: [], clients: {}, error: true });
      }
    }
    load();
  }, [technicianId]);

  if (state.loading) return <Loading />;
  if (state.error) return <Message>Erreur de chargement.</Message>;
  if (state.items.length === 0)
    return <Message>Vous n'avez pas encore soumis d'intervention.</Message>;

  return (
    <ul className="space-y-3">
      {state.items.map((it) => {
        const client = state.clients[it.clientId];
        const nbTaches = (it.tasksDone || []).length;
        return (
          <li key={it.id}>
            <button
              onClick={() => navigate(`/tech/intervention/${it.id}`)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800">
                  {client?.nom || "Client inconnu"}
                </span>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Fait
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">📅 {formatDateFR(it.date)}</div>
              <div className="mt-1 text-xs text-slate-400">
                {nbTaches} tâche{nbTaches > 1 ? "s" : ""} renseignée{nbTaches > 1 ? "s" : ""}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Loading() {
  return <p className="py-10 text-center text-sm text-slate-500">Chargement…</p>;
}
function Message({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      {children}
    </div>
  );
}
