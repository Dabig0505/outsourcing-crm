// Section "Historique" : toutes les interventions, avec filtres (technicien, client,
// statut, période) + consultation détaillée + génération du PDF de la fiche.
import { useEffect, useMemo, useState } from "react";
import { listAllInterventions } from "../../services/interventions";
import { listClients } from "../../services/clients";
import { listTechnicians } from "../../services/technicians";
import { getEntreprise } from "../../services/config";
import { formatDateFR } from "../../utils/recurrence";
import { generateInterventionPDF } from "../../utils/pdf";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { inputClass } from "../../components/ui/Field";

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

  useEffect(() => {
    async function load() {
      try {
        const [items, clients, technicians, ent] = await Promise.all([
          listAllInterventions(),
          listClients(),
          listTechnicians(),
          getEntreprise(),
        ]);
        const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
        setData({ items, clients: byId(clients), technicians: byId(technicians), techList: technicians, cliList: clients });
        setEntreprise(ent);
      } catch (e) {
        console.error(e);
        toast.error("Impossible de charger l'historique.");
        setData({ items: [], clients: {}, technicians: {}, techList: [], cliList: [] });
      }
    }
    load();
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

  function downloadPDF(it) {
    try {
      generateInterventionPDF({
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
      <PageHeader title="Historique" subtitle="Toutes les interventions planifiées et réalisées." />

      <div className="p-8">
        {data === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : (
          <>
            {/* Filtres */}
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
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
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Technicien</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Tâches</th>
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
                        <td className="px-4 py-3 text-slate-500">{(it.tasksDone || []).length}</td>
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
    </>
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
  const tasks = intervention.tasksDone || [];
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

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Tâches</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune tâche renseignée.</p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-emerald-600">✓</span>
                <div>
                  <div>{t.tache}</div>
                  {t.detail && <div className="text-slate-500">{t.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {intervention.commentaireBrut && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Commentaire</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{intervention.commentaireBrut}</p>
        </div>
      )}

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
