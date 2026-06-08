// Fiche d'intervention (mobile-first) — remplir une intervention EXISTANTE.
// Mode "à faire"  : le technicien remplit et soumet (via le composant partagé).
// Mode "fait"     : affichage en lecture seule (consultation depuis "Passées").
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIntervention, submitIntervention } from "../../services/interventions";
import { getClient } from "../../services/clients";
import { listTaskTemplates } from "../../services/taskTemplates";
import { getTechnician } from "../../services/technicians";
import { formatDateFR } from "../../utils/recurrence";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import InterventionSheetEditor from "../../components/technician/InterventionSheetEditor";

export default function InterventionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [intervention, setIntervention] = useState(null);
  const [client, setClient] = useState(null);
  const [titulaire, setTitulaire] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const it = await getIntervention(id);
        if (!it) {
          toast.error("Intervention introuvable.");
          return navigate("/tech", { replace: true });
        }
        const [allTemplates, cli, tit] = await Promise.all([
          listTaskTemplates(),
          getClient(it.clientId),
          it.technicianId ? getTechnician(it.technicianId) : Promise.resolve(null),
        ]);
        setIntervention(it);
        setClient(cli);
        setTitulaire(tit);
        setTemplates(allTemplates);
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit({ taskTemplateId, tasksDone, commentaireBrut }) {
    await submitIntervention(id, {
      taskTemplateId,
      tasksDone,
      commentaireBrut,
      submittedBy: session.technicianId,
    });
    toast.success("Intervention soumise.");
    navigate("/tech", { replace: true, state: { tab: "past" } });
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Chargement…</p>;
  }

  const isDone = intervention.statut === "fait";

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      {/* En-tête non modifiable */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate("/tech")}
          className="mb-2 text-sm font-medium text-slate-500 active:text-slate-700"
        >
          ← Retour
        </button>
        <h1 className="text-lg font-bold text-slate-800">{client?.nom || "Client"}</h1>
        <p className="text-sm text-slate-500">📅 {formatDateFR(intervention.date)}</p>
        {titulaire && (
          <p className="text-xs text-slate-400">Titulaire prévu : {titulaire.nom}</p>
        )}
      </header>

      {isDone ? (
        <ReadOnlyView intervention={intervention} />
      ) : (
        <InterventionSheetEditor
          templates={templates}
          initialTemplateId={intervention.taskTemplateId || ""}
          initialComment={intervention.commentaireBrut || ""}
          submitLabel="Soumettre l'intervention"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// Vue lecture seule d'une intervention déjà soumise.
function ReadOnlyView({ intervention }) {
  const tasks = intervention.tasksDone || [];
  return (
    <div className="mx-auto max-w-md space-y-5 p-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Tâches réalisées</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune tâche renseignée.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t, i) => (
              <li key={i} className="flex gap-2 text-slate-800">
                <span className="text-emerald-600">✓</span>
                <div>
                  <div>{t.tache}</div>
                  {t.detail && <div className="text-sm text-slate-500">{t.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {intervention.commentaireBrut && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Commentaire</h2>
          <p className="whitespace-pre-wrap text-slate-700">{intervention.commentaireBrut}</p>
        </section>
      )}
    </div>
  );
}
