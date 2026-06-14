// Mise en page de l'espace administrateur.
//   - Desktop (lg+) : barre latérale fixe + contenu (inchangé).
//   - Mobile (<lg)  : barre du haut avec menu "hamburger" ouvrant un tiroir.
import { useState } from "react";
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

// Contenu de la barre de navigation, réutilisé sur desktop et dans le tiroir mobile.
function SidebarContent({ onNavigate, logout }) {
  return (
    <>
      <div className="border-b border-slate-200 px-5 py-5 text-center">
        <img
          src="/logo.png"
          alt="Outsourcing Support"
          className="mx-auto h-[140px] w-[140px] object-contain"
        />
        <p className="mt-2 text-xs text-slate-500">Espace administrateur</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
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
    </>
  );
}

export default function AdminLayout() {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Barre latérale — desktop uniquement */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent logout={logout} />
      </aside>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut — mobile uniquement */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-lg leading-none text-slate-700 active:bg-slate-100"
          >
            ☰
          </button>
          <img src="/logo.png" alt="Outsourcing Support" className="h-9 w-9 object-contain" />
          <span className="text-sm font-semibold text-slate-700">Administration</span>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Tiroir de navigation — mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <SidebarContent onNavigate={() => setMenuOpen(false)} logout={logout} />
          </aside>
        </div>
      )}
    </div>
  );
}
