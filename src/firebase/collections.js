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
//   taskTemplateId,        // modèle SUGGÉRÉ (pré-sélection sur la fiche, peut être null)
//   tasksDone: [{ tache: string, detail: string }],   // detail optionnel (peut être "")
//   commentaireBrut, commentaireReformule,
//   photos: [],            // prévu mais NON utilisé (Storage désactivé dans le MVP)
//   submittedAt,           // horodatage de soumission
//   submittedBy            // id du technicien qui a réellement soumis (traçabilité remplaçants)
// }
// IMPORTANT : tasksDone est une LISTE D'OBJETS { tache, detail }, pas une simple
// liste de chaînes — chaque tâche cochée peut porter un détail texte optionnel.
