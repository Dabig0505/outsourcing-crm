// Section "Modèles de tâches" : créer, lister, modifier, archiver/réactiver.
// Chaque modèle contient une liste de tâches (libellés) qui pré-rempliront les fiches.
import { useEffect, useState } from "react";
import {
  listTaskTemplates,
  createTaskTemplate,
  updateTaskTemplate,
  setTaskTemplateActive,
} from "../../services/taskTemplates";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { inputClass } from "../../components/ui/Field";

export default function TaskTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  async function refresh() {
    try {
      setTemplates(await listTaskTemplates());
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les modèles.");
      setTemplates([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(tpl) {
    setEditing(tpl);
    setFormOpen(true);
  }

  async function toggleActive() {
    const t = confirm;
    try {
      await setTaskTemplateActive(t.id, t.actif === false);
      toast.success(t.actif === false ? "Modèle réactivé." : "Modèle archivé.");
      setConfirm(null);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error("Action impossible.");
    }
  }

  return (
    <>
      <PageHeader
        title="Modèles de tâches"
        subtitle="Listes de tâches réutilisables qui pré-remplissent les fiches d'intervention."
      >
        <Button onClick={openCreate}>+ Ajouter un modèle</Button>
      </PageHeader>

      <div className="p-4 lg:p-8">
        {templates === null ? (
          <p className="text-slate-500">Chargement…</p>
        ) : templates.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{t.nom}</h3>
                  {t.actif === false && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Archivé
                    </span>
                  )}
                </div>

                <ul className="mb-4 flex-1 space-y-1 text-sm text-slate-600">
                  {(t.tasks || []).length === 0 ? (
                    <li className="text-slate-400">Aucune tâche.</li>
                  ) : (
                    t.tasks.map((task, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-300">☐</span>
                        {task}
                      </li>
                    ))
                  )}
                </ul>

                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openEdit(t)}>
                    Modifier
                  </Button>
                  <Button
                    variant={t.actif === false ? "secondary" : "danger"}
                    onClick={() => setConfirm(t)}
                  >
                    {t.actif === false ? "Réactiver" : "Archiver"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <TemplateForm
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
        title={confirm?.actif === false ? "Réactiver le modèle" : "Archiver le modèle"}
        message={
          confirm?.actif === false
            ? `Réactiver le modèle « ${confirm?.nom} » ?`
            : `Archiver le modèle « ${confirm?.nom} » ? Il ne sera plus proposé lors de la création de contrats.`
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
      <p className="text-slate-600">Aucun modèle de tâches pour l'instant.</p>
      <p className="mt-1 text-sm text-slate-400">
        Créez un modèle (ex : « Réparation imprimante ») avec sa liste de tâches.
      </p>
      <div className="mt-4 flex justify-center">
        <Button onClick={onAdd}>+ Ajouter un modèle</Button>
      </div>
    </div>
  );
}

// Formulaire avec éditeur de liste de tâches dynamique.
function TemplateForm({ editing, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!editing;
  const [nom, setNom] = useState(editing?.nom || "");
  // On garde toujours au moins une ligne vide pour saisir facilement.
  const [tasks, setTasks] = useState(
    editing?.tasks?.length ? [...editing.tasks] : [""]
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function setTask(index, value) {
    setTasks((list) => list.map((t, i) => (i === index ? value : t)));
  }
  function addTask() {
    setTasks((list) => [...list, ""]);
  }
  function removeTask(index) {
    setTasks((list) => (list.length === 1 ? [""] : list.filter((_, i) => i !== index)));
  }

  function validate() {
    const e = {};
    if (!nom.trim()) e.nom = "Le nom du modèle est obligatoire.";
    if (tasks.every((t) => !t.trim())) e.tasks = "Ajoutez au moins une tâche.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isEdit) {
        await updateTaskTemplate(editing.id, { nom, tasks });
        toast.success("Modèle mis à jour.");
      } else {
        await createTaskTemplate({ nom, tasks });
        toast.success("Modèle créé.");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Enregistrement impossible.");
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Modifier le modèle" : "Ajouter un modèle"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom du modèle" required error={errors.nom}>
          <input
            className={inputClass}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            placeholder="Ex : Réparation imprimante"
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Tâches <span className="text-red-500">*</span>
          </span>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-300">☐</span>
                <input
                  className={inputClass}
                  value={task}
                  onChange={(e) => setTask(i, e.target.value)}
                  placeholder={`Tâche ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeTask(i)}
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  aria-label="Supprimer la tâche"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {errors.tasks && (
            <span className="mt-1 block text-xs text-red-600">{errors.tasks}</span>
          )}
          <button
            type="button"
            onClick={addTask}
            className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            + Ajouter une tâche
          </button>
        </div>

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
