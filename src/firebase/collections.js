// Noms centralisés des collections Firestore.
// On les référence via ces constantes pour éviter les fautes de frappe
// (ex: COLLECTIONS.technicians plutôt que la chaîne "technicians" partout).
export const COLLECTIONS = {
  technicians: "technicians",
  clients: "clients",
  taskTemplates: "taskTemplates",
  contracts: "contracts",
  interventions: "interventions",
  config: "config",
};

// ─────────────────────────────────────────────────────────────────────────
// Rappel de la forme des documents (pour mémoire — implémentés au fil des phases)
// ─────────────────────────────────────────────────────────────────────────
// technicians   : { nom, pinHash, actif, createdAt }
// clients       : { nom, contact, email, telephone, adresse, actif, createdAt }
// taskTemplates : { nom, tasks: [libellé...], actif, isDefault?, createdAt }
// contracts     : { clientId, technicianId, recurrenceRule, taskTemplateId, actif, createdAt }
// config/app    : { adminPinHash, entreprise:{...}, seededDefaultTemplates, createdAt }
//
// interventions : {
//   clientId,
//   technicianId,          // technicien TITULAIRE prévu (indicatif, peut être null)
//   date,                  // "AAAA-MM-JJ"
//   statut ("a_faire"|"fait"),
//   source ("recurrent"|"ponctuel"), contractId,
//   taskTemplateId,        // modèle SUGGÉRÉ (pré-sélectionne la catégorie, peut être null)
//
//   // ── NOUVEAU format de saisie (depuis 2026-06) ──
//   type,                  // catégorie (nom d'un modèle), ex "Maintenance informatique"
//   mode,                  // "sur_site" | "a_distance"  (obligatoire à la soumission)
//   description,           // texte libre décrivant l'intervention
//
//   // ── ANCIEN format (fiches déjà soumises avant le changement) ──
//   tasksDone: [{ tache: string, detail: string }],   // cases cochées + détail
//
//   commentaireBrut, commentaireReformule, // brut conservé pour future reformulation IA
//   photos: [],            // prévu mais NON utilisé (Storage désactivé dans le MVP)
//   submittedAt,           // horodatage de soumission
//   submittedBy            // id du technicien qui a réellement soumis (traçabilité remplaçants)
// }
// RÉTROCOMPAT : le champ `mode` discrimine les deux formats. À l'affichage (historique,
// PDF, consultation technicien), si `mode` est présent -> nouveau format (type/mode/
// description), sinon -> ancien format (tasksDone). Voir src/utils/intervention.js.
