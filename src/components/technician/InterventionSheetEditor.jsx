// Corps réutilisable d'une fiche d'intervention à remplir (mobile-first) :
//   - Type d'intervention (catégorie, reprend les noms des modèles existants)
//   - Mode d'intervention (Sur site / À distance) — OBLIGATOIRE
//   - Description de l'intervention (texte libre, multiligne)
// Utilisé par InterventionForm (remplir une intervention existante) et
// NewInterventionForm (créer + remplir une intervention immédiate).
//
// Le composant gère l'état de saisie ; le PARENT décide quoi faire à la
// soumission via onSubmit({ type, mode, description }).
import { useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { MODES } from "../../utils/intervention";

export default function InterventionSheetEditor({
  templates = [], // sert à proposer les catégories (noms des modèles)
  initialType = "",
  initialMode = "",
  initialDescription = "",
  beforeFields = null, // contenu injecté en haut (ex : client + date pour la création)
  submitLabel = "Soumettre l'intervention",
  validate, // optionnel : () => message d'erreur | null, vérifié avant la soumission
  onSubmit, // async ({ type, mode, description })
}) {
  const toast = useToast();
  const [type, setType] = useState(initialType);
  const [mode, setMode] = useState(initialMode);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);

  // Catégories proposées = noms des modèles actifs (+ la valeur initiale si absente).
  const categories = useMemo(() => {
    const names = templates.filter((t) => t.actif !== false).map((t) => t.nom);
    if (initialType && !names.includes(initialType)) names.unshift(initialType);
    return Array.from(new Set(names));
  }, [templates, initialType]);

  async function handleSubmit() {
    if (validate) {
      const err = validate();
      if (err) return toast.error(err);
    }
    if (!mode) return toast.error("Choisissez le mode d'intervention.");
    if (!description.trim()) return toast.error("Décrivez l'intervention.");

    setSubmitting(true);
    try {
      await onSubmit({ type, mode, description: description.trim() });
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
        {beforeFields}

        {/* Type d'intervention */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Type d'intervention
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-slate-500 focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </section>

        {/* Mode d'intervention (obligatoire) */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Mode d'intervention <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg border py-3 text-sm font-semibold transition ${
                    active
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-300 bg-white text-slate-600 active:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Description de l'intervention */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description de l'intervention <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Décrivez ce qui a été fait (constat, actions réalisées, pièces changées, recommandations…)."
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
