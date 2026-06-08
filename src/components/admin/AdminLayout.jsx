// Mise en page de l'espace administrateur : barre latérale de navigation + contenu.
// Pensé pour le bureau (PC), priorité à la clarté.
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SECTIONS = [
  { to: "/admin/techniciens", label: "Techniciens", icon: "👷" },
  { to: "/admin/clients", label: "Clients", icon: "🏢" },
  { to: "/admin/modeles", label: "Modèles de tâches", icon: "📋" },
  { to: "/admin/contrats", label: "Contrats", icon: "📅" },
  { to: "/admin/historique", label: "Historique", icon: "🗂️" },
  { to: "/admin/parametres", label: "Paramètres", icon: "⚙️" },
];

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Barre latérale */}
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5 text-center">
          <img
            src="/logo.png"
            alt="Outsourcing Support"
            className="mx-auto h-[175px] w-[175px] object-contain"
          />
          <p className="mt-2 text-xs text-slate-500">Espace administrateur</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span aria-hidden>{s.icon}</span>
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Contenu de la section active */}
      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
