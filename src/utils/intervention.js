// Helpers d'affichage des interventions, gérant les DEUX formats :
//   - NOUVEAU format : { type, mode, description }
//   - ANCIEN format  : { tasksDone: [{tache, detail}], commentaireBrut }
// Le champ `mode` n'existe que sur le nouveau format -> sert de discriminant.

export function isNewFormat(intervention) {
  return !!intervention?.mode;
}

// Libellé lisible du mode d'intervention.
export function modeLabel(mode) {
  if (mode === "sur_site") return "Sur site";
  if (mode === "a_distance") return "À distance";
  return "";
}

export const MODES = [
  { value: "sur_site", label: "Sur site" },
  { value: "a_distance", label: "À distance" },
];
