// Fiche d'intervention (mobile-first) — remplir une intervention EXISTANTE.
// Mode "à faire"  : le technicien remplit et soumet (via le composant partagé).
// Mode "fait"     : affichage en lecture seule (gère ancien et nouveau format).
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIntervention, submitIntervention } from "../../services/interventions";
import { getClient } from "../../services/clients";
import { listTaskTemplates } from "../../services/taskTemplates";
import { getTechnician } from "../../services/technicians";
import { formatDateFR } from "../../utils/recurrence";
import { notifyInterventionSubmitted } from "../../services/notifications";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import InterventionSheetEditor from "../../components/technician/InterventionSheetEditor";
import InterventionBody from "../../components/InterventionBody";

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
  const [suggestedType, setSuggestedType] = useState("");

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
        // Catégorie suggérée = nom du modèle associé au contrat (le cas échéant).
        const suggested = allTemplates.find((t) => t.id === it.taskTemplateId);
        setSuggestedType(suggested?.nom || "");
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

  async function handleSubmit({ type, mode, description }) {
    await submitIntervention(id, {
      type,
      mode,
      description,
      submittedBy: session.technicianId,
    });
    // Notification email (sans bloquer : la fiche est déjà enregistrée).
    notifyInterventionSubmitted({
      clientNom: client?.nom || "",
      date: intervention.date,
      technicienNom: session.nom,
      type,
      mode,
      description,
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
        <div className="mx-auto max-w-md p-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <InterventionBody intervention={intervention} />
          </div>
        </div>
      ) : (
        <InterventionSheetEditor
          templates={templates}
          initialType={suggestedType}
          submitLabel="Soumettre l'intervention"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
