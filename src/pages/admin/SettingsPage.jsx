// Section "Paramètres" : coordonnées de l'entreprise, utilisées dans l'en-tête des PDF.
import { useEffect, useState } from "react";
import { getEntreprise, updateEntreprise } from "../../services/config";
import { importInitialData } from "../../services/seedInitialData";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Field, { inputClass } from "../../components/ui/Field";

// ⚠️ TEMPORAIRE — bouton d'import des données initiales.
// Pour MASQUER ce bloc : passer cette valeur à false.
// Pour le RETIRER définitivement : supprimer cette constante, le composant
// <InitialImportPanel/> plus bas, son rendu, et l'import de importInitialData.
const SHOW_INITIAL_IMPORT = false;

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEntreprise()
      .then(setForm)
      .catch((e) => {
        console.error(e);
        toast.error("Impossible de charger les paramètres.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim()) return toast.error("Le nom de l'entreprise est obligatoire.");
    setBusy(true);
    try {
      await updateEntreprise({
        nom: form.nom.trim(),
        adresse: (form.adresse || "").trim(),
        telephone: (form.telephone || "").trim(),
        email: (form.email || "").trim(),
        logo: form.logo || "",
      });
      toast.success("Paramètres enregistrés.");
    } catch (err) {
      console.error(err);
      toast.error("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Paramètres"
        subtitle="Coordonnées de l'entreprise affichées en en-tête des fiches PDF."
      />
      <div className="p-8">
        {!form ? (
          <p className="text-slate-500">Chargement…</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6"
          >
            <Field label="Nom de l'entreprise" required>
              <input className={inputClass} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
            </Field>
            <Field label="Adresse">
              <input className={inputClass} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="Ex : 12 rue X, Casablanca" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone">
                <input className={inputClass} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
              </Field>
              <Field label="E-mail">
                <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        )}

        {SHOW_INITIAL_IMPORT && <InitialImportPanel />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ⚠️ TEMPORAIRE — Panneau d'import des données initiales.
// À supprimer une fois l'import effectué (voir SHOW_INITIAL_IMPORT en haut).
// ─────────────────────────────────────────────────────────────────────────
function InitialImportPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setBusy(true);
    try {
      const res = await importInitialData();
      setResult(res);
      toast.success("Import terminé.");
    } catch (e) {
      console.error(e);
      toast.error("Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 max-w-lg rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-900">⚠️ Import des données initiales (temporaire)</h2>
      <p className="mt-1 text-sm text-amber-800">
        Crée les techniciens, clients et contrats de départ. Sans risque : l'opération
        est <strong>idempotente</strong> (cliquer plusieurs fois ne crée pas de doublon).
      </p>

      <div className="mt-4">
        <Button onClick={run} disabled={busy}>
          {busy ? "Import en cours…" : "Importer les données initiales"}
        </Button>
      </div>

      {result && (
        <div className="mt-5 space-y-4 rounded-lg border border-amber-200 bg-white p-4 text-sm">
          <div className="text-slate-600">
            <p>📅 Date de début des contrats : <strong>{result.dateDebut}</strong></p>
            <p>
              Techniciens : {result.techniciansCreated.length} créé(s),{" "}
              {result.techniciansSkipped.length} déjà présent(s).
            </p>
            <p>
              Clients : {result.clientsCreated.length} créé(s),{" "}
              {result.clientsSkipped.length} déjà présent(s).
            </p>
            <p>
              Contrats : {result.contractsCreated} créé(s), {result.contractsSkipped} déjà
              présent(s) — {result.interventionsGenerated} intervention(s) générée(s).
            </p>
          </div>

          {result.techniciansCreated.length > 0 && (
            <div>
              <p className="font-semibold text-slate-800">
                🔑 Codes PIN temporaires (à communiquer puis à faire changer) :
              </p>
              <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                {result.techniciansCreated.map((t) => (
                  <li key={t.nom} className="flex justify-between px-3 py-2">
                    <span className="text-slate-700">{t.nom}</span>
                    <span className="font-mono font-semibold text-slate-900">{t.pin}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                ⚠️ Ce sont des PIN <strong>temporaires</strong>. Demandez à chaque technicien
                de le changer (ou modifiez-le depuis la section Techniciens).
              </p>
            </div>
          )}

          {result.techniciansSkipped.length > 0 && (
            <p className="text-xs text-slate-500">
              Déjà présents (PIN inchangés) : {result.techniciansSkipped.join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
