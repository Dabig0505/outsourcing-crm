// Section "Paramètres" : coordonnées de l'entreprise, utilisées dans l'en-tête des PDF.
import { useEffect, useState } from "react";
import { getEntreprise, updateEntreprise } from "../../services/config";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Field, { inputClass } from "../../components/ui/Field";

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
      </div>
    </>
  );
}
