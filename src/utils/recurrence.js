// Outils de récurrence : jours de la semaine + calcul des dates d'occurrence.
// La fonction computeOccurrenceDates() est volontairement "pure" (pas de Firestore)
// pour être réutilisée telle quelle en Phase 5 (génération réelle des interventions).

// Jours de la semaine, dans l'ordre français (lundi d'abord).
// `js` = valeur renvoyée par Date.getDay() (0 = dimanche … 6 = samedi).
export const WEEKDAYS = [
  { js: 1, label: "Lundi", short: "Lun" },
  { js: 2, label: "Mardi", short: "Mar" },
  { js: 3, label: "Mercredi", short: "Mer" },
  { js: 4, label: "Jeudi", short: "Jeu" },
  { js: 5, label: "Vendredi", short: "Ven" },
  { js: 6, label: "Samedi", short: "Sam" },
  { js: 0, label: "Dimanche", short: "Dim" },
];

// Convertit une chaîne "AAAA-MM-JJ" en date locale (sans souci de fuseau horaire).
function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Formate une date en "AAAA-MM-JJ".
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Affichage lisible "JJ/MM/AAAA" à partir d'une chaîne "AAAA-MM-JJ".
export function formatDateFR(iso) {
  const d = parseISODate(iso);
  if (!d) return "";
  return d.toLocaleDateString("fr-FR");
}

// Libellés courts des jours sélectionnés, ex : "Lun, Ven".
export function describeDays(joursSemaine) {
  return WEEKDAYS.filter((w) => joursSemaine?.includes(w.js))
    .map((w) => w.short)
    .join(", ");
}

// Calcule toutes les dates d'occurrence (chaînes "AAAA-MM-JJ") entre deux dates
// incluses, pour les jours de semaine choisis. Renvoie [] si paramètres invalides.
// `maxOccurrences` est une sécurité contre une plage de dates anormalement longue.
export function computeOccurrenceDates(
  joursSemaine,
  dateDebut,
  dateFin,
  maxOccurrences = 2000
) {
  const start = parseISODate(dateDebut);
  const end = parseISODate(dateFin);
  if (!start || !end || !joursSemaine?.length || end < start) return [];

  const days = new Set(joursSemaine);
  const dates = [];
  const cursor = new Date(start);

  while (cursor <= end && dates.length < maxOccurrences) {
    if (days.has(cursor.getDay())) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
