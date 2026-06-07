// Indicateur de chargement plein écran.
export default function Spinner({ label = "Chargement…" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
