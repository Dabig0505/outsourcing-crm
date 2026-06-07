// Section "Techniciens" : créer, lister, modifier, activer/désactiver.
import { useEffect, useState } from "react";
import {
  listTechnicians,
  createTechnician,
  updateTechnicianName,
  updateTechnicianPin,
  setTechnicianActive,
} from "../../services/technicians";
import { isValidPin } from "../../utils/pin";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { inputClass } from "../../components/ui/Field";

export default function TechniciansPage() {
  const toast = useToast();
  const [technicians, setTechnicians] = useState(null); // null = en cours de chargement
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // technicien en cours d'édition, ou null = création
  const [confirm, setConfirm] = useState(null); // technicien à activer/désactiver

  async function refresh() {
    try {
      setTechnicians(await listTechnicians());
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les techniciens.");
      setTechnicians([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(tech) {
    setEditing(tech);
    setFormOpen(true);
  }

  async function toggleActive() {
    const tech = confirm;
    try {
      await setTechnicianActive(tech.id, tech.actif === false);
      toast.success(
        tech.actif === false ? "Technicien réactivé." : "Technicien désactivé."
      );
      setConfirm(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Action impossible.");
    }
  }

  return (
    <>
      <PageHeader title="Techniciens" subtitle="Gérez les comptes des techniciens et leurs codes PIN.">
        <Button onClick={openCreate}>+ Ajouter un technicien</Button>
      </PageHeader>

      <div className="p-8">
        {technicians === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : technicians.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.nom}</td>
                    <td className="px-4 py-3">
                      {t.actif === false ? (
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          Inactif
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => openEdit(t)}>
                          Modifier
                        </Button>
                        <Button
                          variant={t.actif === false ? "secondary" : "danger"}
                          onClick={() => setConfirm(t)}
                        >
                          {t.actif === false ? "Réactiver" : "Désactiver"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <TechnicianForm
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
        title={confirm?.actif === false ? "Réactiver le technicien" : "Désactiver le technicien"}
        message={
          confirm?.actif === false
            ? `Réactiver ${confirm?.nom} ? Il pourra de nouveau se connecter.`
            : `Désactiver ${confirm?.nom} ? Il ne pourra plus se connecter, mais son historique est conservé.`
        }
        confirmLabel={confirm?.actif === false ? "Réactiver" : "Désactiver"}
        variant={confirm?.actif === false ? "primary" : "danger"}
      />
    </>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-slate-600">Aucun technicien pour l'instant.</p>
      <p className="mt-1 text-sm text-slate-400">
        Ajoutez votre premier technicien pour lui permettre de se connecter.
      </p>
      <div className="mt-4 flex justify-center">
        <Button onClick={onAdd}>+ Ajouter un technicien</Button>
      </div>
    </div>
  );
}

// Formulaire de création / édition d'un technicien.
function TechnicianForm({ editing, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!editing;
  const [nom, setNom] = useState(editing?.nom || "");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function validate() {
    const e = {};
    if (!nom.trim()) e.nom = "Le nom est obligatoire.";
    // En création, le PIN est obligatoire. En édition, il est optionnel
    // (laisser vide = on garde le PIN actuel).
    if (!isEdit && !isValidPin(pin)) e.pin = "Le PIN doit comporter 4 à 6 chiffres.";
    if (isEdit && pin && !isValidPin(pin)) e.pin = "Le PIN doit comporter 4 à 6 chiffres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isEdit) {
        if (nom.trim() !== editing.nom) await updateTechnicianName(editing.id, nom);
        if (pin) await updateTechnicianPin(editing.id, pin);
        toast.success("Technicien mis à jour.");
      } else {
        await createTechnician({ nom, pin });
        toast.success("Technicien créé.");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Modifier le technicien" : "Ajouter un technicien"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom complet" required error={errors.nom}>
          <input
            className={inputClass}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            placeholder="Ex : Karim Bennani"
          />
        </Field>

        <Field
          label={isEdit ? "Nouveau code PIN" : "Code PIN"}
          required={!isEdit}
          hint={
            isEdit
              ? "Laissez vide pour conserver le PIN actuel. Sinon, 4 à 6 chiffres."
              : "4 à 6 chiffres. Le technicien l'utilisera pour se connecter."
          }
          error={errors.pin}
        >
          <input
            className={inputClass}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder={isEdit ? "••••" : "Ex : 1234"}
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
