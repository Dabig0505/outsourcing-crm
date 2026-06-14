// Section "Historique" : toutes les interventions, avec filtres (technicien, client,
// statut, période) + consultation détaillée + génération du PDF de la fiche.
import { useEffect, useMemo, useState } from "react";
import { listAllInterventions, createIntervention } from "../../services/interventions";
import { listClients } from "../../services/clients";
import { listTechnicians } from "../../services/technicians";
import { listTaskTemplates } from "../../services/taskTemplates";
import { getEntreprise } from "../../services/config";
import { formatDateFR } from "../../utils/recurrence";
import { isNewFormat, modeLabel } from "../../utils/intervention";
import { generateInterventionPDF } from "../../utils/pdf";
import InterventionBody from "../../components/InterventionBody";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Field, { inputClass } from "../../components/ui/Field";

export default function HistoryPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [entreprise, setEntreprise] = useState(null);
  const [filters, setFilters] = useState({
    technicianId: "",
    clientId: "",
    statut: "",
    from: "",
    to: "",
  });
  const [viewing, setViewing] = useState(null);
  const [ponctuelleOpen, setPonctuelleOpen] = useState(false);

  async function refresh() {
    try {
      const [items, clients, technicians, templates, ent] = await Promise.all([
        listAllInterventions(),
        listClients(),
        listTechnicians(),
        listTaskTemplates(),
        getEntreprise(),
      ]);
      const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
      setData({
        items,
        clients: byId(clients),
        technicians: byId(technicians),
        techList: technicians,
        cliList: clients,
        tplList: templates,
      });
      setEntreprise(ent);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger l'historique.");
      setData({ items: [], clients: {}, technicians: {}, techList: [], cliList: [], tplList: [] });
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }
  function resetFilters() {
    setFilters({ technicianId: "", clientId: "", statut: "", from: "", to: "" });
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter((it) => {
      if (filters.clientId && it.clientId !== filters.clientId) return false;
      if (filters.statut && it.statut !== filters.statut) return false;
      // "par technicien" = titulaire prévu OU technicien ayant soumis.
      if (
        filters.technicianId &&
        it.technicianId !== filters.technicianId &&
        it.submittedBy !== filters.technicianId
      )
        return false;
      if (filters.from && (it.date || "") < filters.from) return false;
      if (filters.to && (it.date || "") > filters.to) return false;
      return true;
    });
  }, [data, filters]);

  function technicienLabel(it) {
    if (it.statut === "fait") return data.technicians[it.submittedBy]?.nom || "—";
    return it.technicianId ? data.technicians[it.technicianId]?.nom || "—" : "Non défini";
  }

  async function downloadPDF(it) {
    try {
      await generateInterventionPDF({
        intervention: it,
        client: data.clients[it.clientId] || null,
        technicien: data.technicians[it.submittedBy] || null,
        titulaire: data.technicians[it.technicianId] || null,
        entreprise,
      });
    } catch (e) {
      console.error(e);
      toast.error("Génération du PDF impossible.");
    }
  }

  return (
    <>
      <PageHeader title="Historique" subtitle="Toutes les interventions planifiées et réalisées.">
        <Button onClick={() => setPonctuelleOpen(true)}>+ Intervention ponctuelle</Button>
      </PageHeader>

      <div className="p-4 lg:p-8">
        {data === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : (
          <>
            {/* Filtres (empilés sur mobile, en ligne sur desktop) */}
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <FilterField label="Technicien">
                <select className={inputClass} value={filters.technicianId} onChange={(e) => setFilter("technicianId", e.target.value)}>
                  <option value="">Tous</option>
                  {data.techList.map((t) => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Client">
                <select className={inputClass} value={filters.clientId} onChange={(e) => setFilter("clientId", e.target.value)}>
                  <option value="">Tous</option>
                  {data.cliList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Statut">
                <select className={inputClass} value={filters.statut} onChange={(e) => setFilter("statut", e.target.value)}>
                  <option value="">Tous</option>
                  <option value="a_faire">À faire</option>
                  <option value="fait">Réalisées</option>
                </select>
              </FilterField>
              <FilterField label="Du">
                <input type="date" className={inputClass} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
              </FilterField>
              <FilterField label="Au">
                <input type="date" className={inputClass} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
              </FilterField>
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            </div>

            <p className="mb-2 text-sm text-slate-500">
              {filtered.length} intervention{filtered.length > 1 ? "s" : ""}
            </p>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                Aucune intervention ne correspond à ces filtres.
              </div>
            ) : (
              <>
              {/* Desktop : tableau */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Technicien</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Type / Mode</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">{formatDateFR(it.date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {data.clients[it.clientId]?.nom || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{technicienLabel(it)}</td>
                        <td className="px-4 py-3">
                          {it.statut === "fait" ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Réalisée</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">À faire</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {isNewFormat(it) ? (
                            <>
                              <div className="text-slate-700">{it.type || "—"}</div>
                              <div className="text-xs text-slate-400">{modeLabel(it.mode)}</div>
                            </>
                          ) : (it.tasksDone || []).length ? (
                            `${it.tasksDone.length} tâche${it.tasksDone.length > 1 ? "s" : ""}`
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setViewing(it)}>Voir</Button>
                            {it.statut === "fait" && (
                              <Button onClick={() => downloadPDF(it)}>PDF</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile : cartes */}
              <ul className="space-y-3 lg:hidden">
                {filtered.map((it) => (
                  <li key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-800">
                        {data.clients[it.clientId]?.nom || "—"}
                      </span>
                      {it.statut === "fait" ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Réalisée</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">À faire</span>
                      )}
                    </div>
                    <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                      <div>📅 {formatDateFR(it.date)}</div>
                      <div>👷 {technicienLabel(it)}</div>
                      <div>
                        {isNewFormat(it)
                          ? `${it.type || "—"} · ${modeLabel(it.mode)}`
                          : (it.tasksDone || []).length
                          ? `${it.tasksDone.length} tâche${it.tasksDone.length > 1 ? "s" : ""}`
                          : "—"}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setViewing(it)}>Voir</Button>
                      {it.statut === "fait" && (
                        <Button className="flex-1" onClick={() => downloadPDF(it)}>PDF</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )}
          </>
        )}
      </div>

      {/* Détail d'une intervention */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Détail de l'intervention">
        {viewing && (
          <DetailView
            intervention={viewing}
            client={data.clients[viewing.clientId]}
            technicien={data.technicians[viewing.submittedBy]}
            titulaire={data.technicians[viewing.technicianId]}
            onPDF={() => downloadPDF(viewing)}
          />
        )}
      </Modal>

      {/* Création d'une intervention ponctuelle (hors contrat) */}
      {ponctuelleOpen && data && (
        <PonctuelleForm
          clients={data.cliList.filter((c) => c.actif !== false)}
          technicians={data.techList.filter((t) => t.actif !== false)}
          templates={data.tplList.filter((t) => t.actif !== false)}
          onClose={() => setPonctuelleOpen(false)}
          onSaved={() => {
            setPonctuelleOpen(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

// Formulaire de création d'une intervention ponctuelle (source "ponctuel").
function PonctuelleForm({ clients, technicians, templates, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    clientId: "",
    date: "",
    technicianId: "",
    taskTemplateId: "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.clientId) errs.clientId = "Sélectionnez un client.";
    if (!form.date) errs.date = "Choisissez une date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await createIntervention({
        clientId: form.clientId,
        date: form.date,
        technicianId: form.technicianId || null,
        taskTemplateId: form.taskTemplateId || null,
        statut: "a_faire",
        source: "ponctuel",
        contractId: null,
      });
      toast.success("Intervention ponctuelle créée.");
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Création impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Nouvelle intervention ponctuelle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Client" required error={errors.clientId}>
          <select className={inputClass} value={form.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">— Sélectionnez —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </Field>

        <Field label="Date" required error={errors.date}>
          <input type="date" className={inputClass} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>

        <Field
          label="Technicien titulaire"
          hint="Optionnel — indicatif. N'importe quel technicien pourra prendre l'intervention."
        >
          <select className={inputClass} value={form.technicianId} onChange={(e) => set("technicianId", e.target.value)}>
            <option value="">— Aucun (non défini) —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        </Field>

        <Field label="Modèle de tâches" hint="Optionnel — pré-rempli sur la fiche, modifiable par le technicien.">
          <select className={inputClass} value={form.taskTemplateId} onChange={(e) => set("taskTemplateId", e.target.value)}>
            <option value="">— Aucun —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        </Field>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Création…" : "Créer l'intervention"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function DetailView({ intervention, client, technicien, titulaire, onPDF }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info label="Client" value={client?.nom} />
        <Info label="Date" value={formatDateFR(intervention.date)} />
        <Info
          label="Technicien"
          value={
            intervention.statut === "fait"
              ? technicien?.nom
              : titulaire?.nom || "Non défini"
          }
        />
        <Info label="Statut" value={intervention.statut === "fait" ? "Réalisée" : "À faire"} />
      </div>

      {/* Contenu (gère le nouveau format type/mode/description et l'ancien tasksDone). */}
      <InterventionBody intervention={intervention} />

      {intervention.statut === "fait" && (
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button onClick={onPDF}>Télécharger le PDF</Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span className="block text-xs text-slate-400">{label}</span>
      <span className="text-slate-800">{value || "—"}</span>
    </div>
  );
}
