// Section "Clients" : créer, lister, modifier, archiver/réactiver.
import { useEffect, useState } from "react";
import {
  listClients,
  createClient,
  updateClient,
  setClientActive,
} from "../../services/clients";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { inputClass } from "../../components/ui/Field";

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  async function refresh() {
    try {
      setClients(await listClients());
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les clients.");
      setClients([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(client) {
    setEditing(client);
    setFormOpen(true);
  }

  async function toggleActive() {
    const c = confirm;
    try {
      await setClientActive(c.id, c.actif === false);
      toast.success(c.actif === false ? "Client réactivé." : "Client archivé.");
      setConfirm(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Action impossible.");
    }
  }

  return (
    <>
      <PageHeader title="Clients" subtitle="Gérez les entreprises clientes où interviennent les techniciens.">
        <Button onClick={openCreate}>+ Ajouter un client</Button>
      </PageHeader>

      <div className="p-4 lg:p-8">
        {clients === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : clients.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <>
          {/* Desktop : tableau */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Coordonnées</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.nom}</div>
                      {c.adresse && <div className="text-xs text-slate-400">{c.adresse}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.contact || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{c.telephone || ""}</div>
                      <div className="text-xs text-slate-400">{c.email || ""}</div>
                      {!c.telephone && !c.email && "—"}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : cartes */}
          <ul className="space-y-3 lg:hidden">
            {clients.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-800">{c.nom}</span>
                  {c.actif === false ? (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">Archivé</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Actif</span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                  {c.contact && <div>👤 {c.contact}</div>}
                  {c.telephone && <div>📞 {c.telephone}</div>}
                  {c.email && <div className="break-all">✉️ {c.email}</div>}
                  {c.adresse && <div className="text-slate-400">📍 {c.adresse}</div>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openEdit(c)}>Modifier</Button>
                  <Button
                    variant={c.actif === false ? "secondary" : "danger"}
                    className="flex-1"
                    onClick={() => setConfirm(c)}
                  >
                    {c.actif === false ? "Réactiver" : "Archiver"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>

      {formOpen && (
        <ClientForm
          editing={editing}
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
        title={confirm?.actif === false ? "Réactiver le client" : "Archiver le client"}
        message={
          confirm?.actif === false
            ? `Réactiver ${confirm?.nom} ?`
            : `Archiver ${confirm?.nom} ? Il n'apparaîtra plus dans les listes de création de contrats, mais son historique est conservé.`
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
      <p className="text-slate-600">Aucun client pour l'instant.</p>
      <p className="mt-1 text-sm text-slate-400">Ajoutez votre premier client.</p>
      <div className="mt-4 flex justify-center">
        <Button onClick={onAdd}>+ Ajouter un client</Button>
      </div>
    </div>
  );
}

// Formulaire de création / édition d'un client.
function ClientForm({ editing, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!editing;
  const [form, setForm] = useState({
    nom: editing?.nom || "",
    contact: editing?.contact || "",
    email: editing?.email || "",
    telephone: editing?.telephone || "",
    adresse: editing?.adresse || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.nom.trim()) return setError("Le nom du client est obligatoire.");
    setBusy(true);
    try {
      if (isEdit) {
        await updateClient(editing.id, form);
        toast.success("Client mis à jour.");
      } else {
        await createClient(form);
        toast.success("Client créé.");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Modifier le client" : "Ajouter un client"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom du client / entreprise" required error={error}>
          <input
            className={inputClass}
            value={form.nom}
            onChange={(e) => set("nom", e.target.value)}
            autoFocus
            placeholder="Ex : Cabinet Médical Atlas"
          />
        </Field>

        <Field label="Personne à contacter">
          <input
            className={inputClass}
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="Ex : Dr. Alami"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <input
              className={inputClass}
              value={form.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              placeholder="06 00 00 00 00"
            />
          </Field>
          <Field label="E-mail">
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contact@client.ma"
            />
          </Field>
        </div>

        <Field label="Adresse">
          <input
            className={inputClass}
            value={form.adresse}
            onChange={(e) => set("adresse", e.target.value)}
            placeholder="Ex : 12 rue X, Casablanca"
          />
        </Field>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
