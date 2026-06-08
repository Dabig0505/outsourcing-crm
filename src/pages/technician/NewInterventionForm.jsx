// Création + remplissage d'une intervention "sur le moment" par le technicien.
// Le technicien choisit un client existant + une date (aujourd'hui par défaut),
// remplit la fiche (modèle/tâches/commentaire) et soumet : l'intervention est
// créée directement au statut "fait" (source "ponctuel") et apparaît dans "Passées".
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCompletedIntervention } from "../../services/interventions";
import { listClients } from "../../services/clients";
import { listTaskTemplates } from "../../services/taskTemplates";
import { toISODate } from "../../utils/recurrence";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import InterventionSheetEditor from "../../components/technician/InterventionSheetEditor";

export default function NewInterventionForm() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(toISODate(new Date())); // aujourd'hui par défaut

  useEffect(() => {
    async function load() {
      try {
        const [cli, tpl] = await Promise.all([listClients(), listTaskTemplates()]);
        setClients(cli.filter((c) => c.actif !== false));
        setTemplates(tpl.filter((t) => t.actif !== false));
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate() {
    if (!clientId) return "Sélectionnez un client.";
    if (!date) return "Choisissez une date.";
    return null;
  }

  async function handleSubmit({ taskTemplateId, tasksDone, commentaireBrut }) {
    await createCompletedIntervention({
      clientId,
      date,
      taskTemplateId,
      tasksDone,
      commentaireBrut,
      submittedBy: session.technicianId,
    });
    toast.success("Intervention enregistrée.");
    navigate("/tech", { replace: true, state: { tab: "past" } });
  }

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Chargement…</p>;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate("/tech")}
          className="mb-2 text-sm font-medium text-slate-500 active:text-slate-700"
        >
          ← Retour
        </button>
        <h1 className="text-lg font-bold text-slate-800">Nouvelle intervention</h1>
        <p className="text-sm text-slate-500">Intervention réalisée maintenant</p>
      </header>

      <InterventionSheetEditor
        templates={templates}
        submitLabel="Enregistrer l'intervention"
        validate={validate}
        onSubmit={handleSubmit}
        beforeTemplate={
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-slate-500 focus:outline-none"
              >
                <option value="">— Sélectionnez un client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 focus:border-slate-500 focus:outline-none"
              />
            </div>
          </section>
        }
      />
    </div>
  );
}
