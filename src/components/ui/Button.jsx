// Bouton réutilisable avec quelques variantes de style.
const VARIANTS = {
  primary: "bg-slate-800 text-white hover:bg-slate-700",
  secondary: "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export default function Button({
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
