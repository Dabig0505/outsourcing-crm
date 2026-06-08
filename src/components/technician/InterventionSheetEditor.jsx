// Corps réutilisable d'une fiche d'intervention à remplir (mobile-first) :
// choix du modèle, tâches cochables avec détail, tâches libres, commentaire,
// et barre de soumission fixe. Utilisé par :
//   - InterventionForm  (remplir une intervention existante "à faire")
//   - NewInterventionForm (créer + remplir une intervention immédiate, côté technicien)
//
// Le composant gère l'état de saisie ; le PARENT décide quoi faire à la soumission
// via onSubmit({ taskTemplateId, tasksDone, commentaireBrut }).
import { useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";

// Construit les lignes de tâches à partir d'un modèle (toutes décochées au départ).
export function buildRows(template) {
  return (template?.tasks || []).map((tache) => ({ tache, checked: false, detail: "" }));
}

export default function InterventionSheetEditor({
  templates = [],
  initialTemplateId = "",
  initialComment = "",
  beforeTemplate = null, // contenu injecté en haut (ex : client + date pour la création)
  submitLabel = "Soumettre l'intervention",
  validate, // optionnel : () => message d'erreur | null, vérifié avant la soumission
  onSubmit, // async ({ taskTemplateId, tasksDone, commentaireBrut })
}) {
  const toast = useToast();
  const templatesById = useMemo(
    () => Object.fromEntries(templates.map((t) => [t.id, t])),
    [templates]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [templateTasks, setTemplateTasks] = useState(() =>
    buildRows(templatesById[initialTemplateId])
  );
  const [freeTasks, setFreeTasks] = useState([]); // [{tache, detail}]
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);

  // Modèles proposés : actifs + éventuellement celui déjà sélectionné (même archivé).
  const templateOptions = useMemo(
    () => templates.filter((t) => t.actif !== false || t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  function onChangeTemplate(newId) {
    setSelectedTemplateId(newId);
    setTemplateTasks(buildRows(templatesById[newId]));
  }
  function toggleTask(i) {
    setTemplateTasks((rows) => rows.map((r, idx) => (idx === i ? { ...r, checked: !r.checked } : r)));
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
    // Validation propre au parent (ex : client requis pour une création).
    if (validate) {
      const err = validate();
      if (err) return toast.error(err);
    }

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
      await onSubmit({
        taskTemplateId: selectedTemplateId || null,
        tasksDone,
        commentaireBrut: comment,
      });
      // Succès : le parent gère la navigation / le message.
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Soumission impossible.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-md space-y-5 p-4">
        {beforeTemplate}

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
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Tâches supplémentaires</h2>
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

      {/* Barre de soumission fixe */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto max-w-md">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-slate-800 py-3.5 text-base font-semibold text-white active:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? "Envoi…" : submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
