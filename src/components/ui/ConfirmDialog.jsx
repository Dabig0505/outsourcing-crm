// Boîte de dialogue de confirmation (ex : "Voulez-vous vraiment désactiver ?").
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmer",
  message,
  confirmLabel = "Confirmer",
  variant = "primary",
  busy,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={busy}>
          {busy ? "Veuillez patienter…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
