// Section "Contrats" : interventions récurrentes (client + technicien + modèle +
// jours de la semaine + période). Création / liste / modification / archivage.
// À la création/modification, les interventions sont générées automatiquement
// (Phase 5) via syncContractInterventions.
import { useEffect, useMemo, useState } from "react";
import { listClients } from "../../services/clients";
import { listTechnicians } from "../../services/technicians";
import { listTaskTemplates } from "../../services/taskTemplates";
import {
  listContracts,
  createContract,
  updateContract,
  setContractActive,
} from "../../services/contracts";
import {
  syncContractInterventions,
  removePlannedForContract,
} from "../../services/contractGeneration";
import {
  WEEKDAYS,
  describeDays,
  formatDateFR,
  computeOccurrenceDates,
} from "../../utils/recurrence";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { inputClass } from "../../components/ui/Field";

export default function ContractsPage() {
  const toast = useToast();
  const [data, setData] = useState(null); // { contracts, clients, technicians, templates }
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  async function refresh() {
    try {
      const [contracts, clients, technicians, templates] = await Promise.all([
        listContracts(),
        listClients(),
        listTechnicians(),
        listTaskTemplates(),
      ]);
      setData({ contracts, clients, technicians, templates });
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les contrats.");
      setData({ contracts: [], clients: [], technicians: [], templates: [] });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Dictionnaires id -> nom, pour afficher les noms dans la liste.
  const maps = useMemo(() => {
    const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
    return {
      clients: byId(data?.clients),
      technicians: byId(data?.technicians),
      templates: byId(data?.templates),
    };
  }, [data]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(contract) {
    setEditing(contract);
    setFormOpen(true);
  }

  async function toggleActive() {
    const c = confirm;
    const reactivating = c.actif === false;
    try {
      await setContractActive(c.id, reactivating);
      if (reactivating) {
        const res = await syncContractInterventions(c);
        toast.success(`Contrat réactivé — ${res.created} intervention(s) régénérée(s).`);
      } else {
        const n = await removePlannedForContract(c.id);
        toast.success(`Contrat archivé — ${n} intervention(s) à faire retirée(s).`);
      }
      setConfirm(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Action impossible.");
    }
  }

  // Régénère manuellement les interventions d'un contrat (re-synchronisation).
  const [regenId, setRegenId] = useState(null);
  async function regenerate(c) {
    setRegenId(c.id);
    try {
      const res = await syncContractInterventions(c);
      toast.success(
        `Synchronisé : ${res.created} ajoutée(s), ${res.deleted} retirée(s) — ${res.total} au total.`
      );
    } catch (e) {
      console.error(e);
      toast.error("Génération impossible.");
    } finally {
      setRegenId(null);
    }
  }

  // Seul prérequis : au moins un client actif (technicien et modèle sont optionnels).
  const noPrerequisites =
    data && data.clients.filter((c) => c.actif !== false).length === 0;

  return (
    <>
      <PageHeader
        title="Contrats"
        subtitle="Interventions récurrentes : un technicien chez un client selon des jours fixes."
      >
        <Button onClick={openCreate} disabled={!data || noPrerequisites}>
          + Ajouter un contrat
        </Button>
      </PageHeader>

      <div className="p-8">
        {data === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : noPrerequisites ? (
          <PrerequisiteNotice />
        ) : data.contracts.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Titulaire</th>
                  <th className="px-4 py-3 font-medium">Modèle</th>
                  <th className="px-4 py-3 font-medium">Jours</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.contracts.map((c) => {
                  const rule = c.recurrenceRule || {};
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {maps.clients[c.clientId]?.nom || "— supprimé —"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.technicianId
                          ? maps.technicians[c.technicianId]?.nom || "— supprimé —"
                          : "Non défini"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.taskTemplateId
                          ? maps.templates[c.taskTemplateId]?.nom || "— supprimé —"
                          : "Aucun"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {describeDays(rule.joursSemaine) || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateFR(rule.dateDebut)} → {formatDateFR(rule.dateFin)}
                      </td>
                      <td className="px-4 py-3">
                        {c.actif === false ? (
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Archivé
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {c.actif !== false && (
                            <Button
                              variant="ghost"
                              onClick={() => regenerate(c)}
                              disabled={regenId === c.id}
                            >
                              {regenId === c.id ? "…" : "Régénérer"}
                            </Button>
                          )}
                          <Button variant="secondary" onClick={() => openEdit(c)}>
                            Modifier
                          </Button>
                          <Button
                            variant={c.actif === false ? "secondary" : "danger"}
                            onClick={() => setConfirm(c)}
                          >
                            {c.actif === false ? "Réactiver" : "Archiver"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ContractForm
          editing={editing}
          clients={data.clients.filter((c) => c.actif !== false)}
          technicians={data.technicians.filter((t) => t.actif !== false)}
          templates={data.templates.filter((t) => t.actif !== false)}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={toggleActive}
        title={confirm?.actif === false ? "Réactiver le contrat" : "Archiver le contrat"}
        message={
          confirm?.actif === false
            ? "Réactiver ce contrat ?"
            : "Archiver ce contrat ? Il restera dans l'historique mais ne sera plus actif."
        }
        confirmLabel={confirm?.actif === false ? "Réactiver" : "Archiver"}
        variant={confirm?.actif === false ? "primary" : "danger"}
      />
    </>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-slate-600">Aucun contrat pour l'instant.</p>
      <p className="mt-1 text-sm text-slate-400">
        Créez un contrat pour planifier des interventions récurrentes.
      </p>
      <div className="mt-4 flex justify-center">
        <Button onClick={onAdd}>+ Ajouter un contrat</Button>
      </div>
    </div>
  );
}

// Message si le prérequis manque (il faut au moins 1 client actif).
function PrerequisiteNotice() {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-10 text-center text-amber-800">
      <p className="font-medium">Avant de créer un contrat, il faut d'abord un client.</p>
      <p className="mt-1 text-sm">Ajoutez au moins un client (actif) dans la section Clients.</p>
    </div>
  );
}

// Formulaire de création / édition d'un contrat.
function ContractForm({ editing, clients, technicians, templates, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!editing;
  const rule = editing?.recurrenceRule || {};
  const [form, setForm] = useState({
    clientId: editing?.clientId || "",
    technicianId: editing?.technicianId || "",
    taskTemplateId: editing?.taskTemplateId || "",
    joursSemaine: rule.joursSemaine || [],
    dateDebut: rule.dateDebut || "",
    dateFin: rule.dateFin || "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDay(js) {
    setForm((f) => ({
      ...f,
      joursSemaine: f.joursSemaine.includes(js)
        ? f.joursSemaine.filter((d) => d !== js)
        : [...f.joursSemaine, js],
    }));
  }

  // Aperçu du nombre d'interventions qui seront générées (en Phase 5).
  const occurrences = useMemo(
    () => computeOccurrenceDates(form.joursSemaine, form.dateDebut, form.dateFin),
    [form.joursSemaine, form.dateDebut, form.dateFin]
  );

  function validate() {
    const e = {};
    if (!form.clientId) e.clientId = "Sélectionnez un client.";
    // Technicien titulaire et modèle de tâches sont OPTIONNELS (pas de validation).
    if (!form.joursSemaine.length) e.joursSemaine = "Choisissez au moins un jour.";
    if (!form.dateDebut) e.dateDebut = "Date de début requise.";
    if (!form.dateFin) e.dateFin = "Date de fin requise.";
    if (form.dateDebut && form.dateFin && form.dateFin < form.dateDebut)
      e.dateFin = "La date de fin doit être après la date de début.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      // Identifiant du contrat (existant en édition, nouveau en création).
      const id = isEdit ? editing.id : await createContract(form);
      if (isEdit) await updateContract(id, form);

      // Génération / synchronisation automatique des interventions.
      const contract = {
        id,
        clientId: form.clientId,
        technicianId: form.technicianId,
        taskTemplateId: form.taskTemplateId,
        recurrenceRule: {
          joursSemaine: form.joursSemaine,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin,
        },
      };
      const res = await syncContractInterventions(contract);

      if (isEdit) {
        toast.success(
          `Contrat mis à jour — ${res.created} ajoutée(s), ${res.deleted} retirée(s).`
        );
      } else {
        toast.success(`Contrat créé — ${res.created} intervention(s) générée(s).`);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Modifier le contrat" : "Nouveau contrat"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client" required error={errors.clientId}>
          <select className={inputClass} value={form.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">— Sélectionnez —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Technicien titulaire"
          hint="Optionnel — le technicien habituel du contrat. Indicatif : un remplaçant peut faire l'intervention."
        >
          <select className={inputClass} value={form.technicianId} onChange={(e) => set("technicianId", e.target.value)}>
            <option value="">— Aucun (non défini) —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Modèle de tâches"
          hint="Optionnel — suggestion par défaut, que le technicien pourra modifier sur la fiche."
        >
          <select className={inputClass} value={form.taskTemplateId} onChange={(e) => set("taskTemplateId", e.target.value)}>
            <option value="">— Aucun —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Jours de la semaine <span className="text-red-500">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((w) => {
              const active = form.joursSemaine.includes(w.js);
              return (
                <button
                  key={w.js}
                  type="button"
                  onClick={() => toggleDay(w.js)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
          {errors.joursSemaine && (
            <span className="mt-1 block text-xs text-red-600">{errors.joursSemaine}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début" required error={errors.dateDebut}>
            <input type="date" className={inputClass} value={form.dateDebut} onChange={(e) => set("dateDebut", e.target.value)} />
          </Field>
          <Field label="Date de fin" required error={errors.dateFin}>
            <input type="date" className={inputClass} value={form.dateFin} onChange={(e) => set("dateFin", e.target.value)} />
          </Field>
        </div>

        {/* Aperçu informatif — la génération réelle viendra en Phase 5. */}
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          {occurrences.length > 0 ? (
            <>
              📅 Ce contrat couvre <strong>{occurrences.length}</strong> intervention
              {occurrences.length > 1 ? "s" : ""}.
              <span className="text-slate-400"> (générées automatiquement à l'enregistrement)</span>
            </>
          ) : (
            <span className="text-slate-400">
              Choisissez des jours et une période pour voir le nombre d'interventions.
            </span>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le contrat"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
