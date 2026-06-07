// Petites notifications éphémères (en haut à droite) pour confirmer une action
// ("Technicien créé", "Erreur…"). Utilisable partout via le hook useToast().
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "success") => {
      const id = nextId++;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  const toast = {
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un <ToastProvider>");
  return ctx;
}
