// Fiche d'intervention (mobile-first) — le cœur de l'app.
// Mode "à faire"  : le technicien remplit et soumet.
// Mode "fait"     : affichage en lecture seule (consultation depuis "Passées").
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIntervention, submitIntervention } from "../../services/interventions";
import { getClient } from "../../services/clients";
import { listTaskTemplates } from "../../services/taskTemplates";
import { getTechnician } from "../../services/technicians";
import { formatDateFR } from "../../utils/recurrence";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function InterventionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [intervention, setIntervention] = useState(null);
  const [client, setClient] = useState(null);
  const [titulaire, setTitulaire] = useState(null);
  const [templatesById, setTemplatesById] = useState({});
  const [templates, setTemplates] = useState([]);

  // État du formulaire.
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateTasks, setTemplateTasks] = useState([]); // [{tache, checked, detail}]
  const [freeTasks, setFreeTasks] = useState([]); // [{tache, detail}]
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        const byId = Object.fromEntries(allTemplates.map((t) => [t.id, t]));

        setIntervention(it);
        setClient(cli);
        setTitulaire(tit);
        setTemplatesById(byId);
        setTemplates(allTemplates);

        // Pré-remplissage avec le modèle suggéré par le contrat (le cas échéant).
        const suggested = it.taskTemplateId || "";
        setSelectedTemplateId(suggested);
        setTemplateTasks(buildRows(byId[suggested]));
        setComment(it.commentaireBrut || "");
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

  // Liste des modèles proposés : actifs + éventuellement celui déjà sélectionné.
  const templateOptions = useMemo(
    () => templates.filter((t) => t.actif !== false || t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  function onChangeTemplate(newId) {
    setSelectedTemplateId(newId);
    setTemplateTasks(buildRows(templatesById[newId]));
  }

  function toggleTask(i) {
    setTemplateTasks((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r))
    );
  }
  function setTaskDetail(i, detail) {
    setTemplateTasks((rows) => rows.map((r, idx) => (idx === i ? { ...r, detail } : r)));
  }

  function addFreeTask() {
    setFreeTasks((list) => [...list, { tache: "", detail: "" }]);
  }
  function setFree(i, key, value) {
    setFreeTasks((list) => list.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeFree(i) {
    setFreeTasks((list) => list.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    const tasksDone = [
      ...templateTasks
        .filter((r) => r.checked)
        .map((r) => ({ tache: r.tache, detail: (r.detail || "").trim() })),
      ...freeTasks
        .filter((r) => r.tache.trim())
        .map((r) => ({ tache: r.tache.trim(), detail: (r.detail || "").trim() })),
    ];

    if (tasksDone.length === 0 && !comment.trim()) {
      return toast.error("Cochez au moins une tâche ou ajoutez un commentaire.");
    }

    setSubmitting(true);
    try {
      await submitIntervention(id, {
        taskTemplateId: selectedTemplateId || null,
        tasksDone,
        commentaireBrut: comment,
        submittedBy: session.technicianId,
      });
      toast.success("Intervention soumise.");
      navigate("/tech", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Soumission impossible.");
      setSubmitting(false);
    }
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
        <div className="mx-auto max-w-md space-y-5 p-4">
          {/* Choix du modèle */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Modèle de tâches
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => onChangeTemplate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-slate-500 focus:outline-none"
            >
              <option value="">— Aucun modèle —</option>
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </section>

          {/* Tâches du modèle */}
          {templateTasks.length > 0 && (
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Tâches</h2>
              <ul className="space-y-3">
                {templateTasks.map((row, i) => (
                  <li key={i} className="rounded-xl border border-slate-100 p-1">
                    <label className="flex cursor-pointer items-start gap-3 p-2">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={() => toggleTask(i)}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-slate-800"
                      />
                      <span className="text-slate-800">{row.tache}</span>
                    </label>
                    {row.checked && (
                      <input
                        value={row.detail}
                        onChange={(e) => setTaskDetail(i, e.target.value)}
                        placeholder="Détail (optionnel)…"
                        className="mt-1 ml-10 w-[calc(100%-2.5rem)] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tâches libres */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Tâches supplémentaires
            </h2>
            {freeTasks.length === 0 && (
              <p className="mb-3 text-sm text-slate-400">
                Ajoutez une tâche non prévue dans le modèle, si besoin.
              </p>
            )}
            <ul className="space-y-3">
              {freeTasks.map((row, i) => (
                <li key={i} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={row.tache}
                      onChange={(e) => setFree(i, "tache", e.target.value)}
                      placeholder="Tâche réalisée"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeFree(i)}
                      className="shrink-0 rounded-md p-2 text-slate-400 active:bg-slate-100"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    value={row.detail}
                    onChange={(e) => setFree(i, "detail", e.target.value)}
                    placeholder="Détail (optionnel)…"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addFreeTask}
              className="mt-3 text-sm font-medium text-slate-600 active:text-slate-800"
            >
              + Ajouter une tâche
            </button>
          </section>

          {/* Commentaire global */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Commentaire général
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Remarques, observations…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-slate-500 focus:outline-none"
            />
          </section>
        </div>
      )}

      {/* Barre de soumission fixe (uniquement en mode "à faire") */}
      {!isDone && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto max-w-md">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-slate-800 py-3.5 text-base font-semibold text-white active:bg-slate-700 disabled:opacity-60"
            >
              {submitting ? "Envoi…" : "Soumettre l'intervention"}
            </button>
          </div>
        </div>
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

// Construit les lignes de tâches à partir d'un modèle (toutes décochées au départ).
function buildRows(template) {
  return (template?.tasks || []).map((tache) => ({ tache, checked: false, detail: "" }));
}
