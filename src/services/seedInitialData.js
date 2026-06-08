// Import des données initiales, déclenché par un bouton admin TEMPORAIRE.
// IMPORTANT : exécuté DEPUIS l'app (App Check OK), surtout pas via un script externe.
//
// Idempotent : on ne crée que ce qui manque (comparaison par nom pour les
// techniciens/clients, par client+jours pour les contrats). Cliquer plusieurs
// fois ne crée pas de doublon.
import { listTechnicians, createTechnician } from "./technicians";
import { listClients, createClient } from "./clients";
import { listContracts, createContract } from "./contracts";
import { syncContractInterventions } from "./contractGeneration";
import { toISODate } from "../utils/recurrence";

// 5 techniciens avec PIN temporaires DIFFÉRENTS (à changer ensuite).
export const TEMP_TECHNICIANS = [
  { nom: "Zakaria Hmimat", pin: "2468" },
  { nom: "Imrane Bara", pin: "1357" },
  { nom: "Mouad Elmoutaouakil", pin: "9753" },
  { nom: "Hamza Bouzekri", pin: "8024" },
  { nom: "Youssef", pin: "6190" },
];

// 8 clients (nom seul ; coordonnées à compléter ensuite).
export const INITIAL_CLIENTS = [
  "Fidupartner",
  "Sutra",
  "Upsilon Consulting",
  "Fluides Systèmes",
  "Ferroplast",
  "Galvafil",
  "Sanipack",
  "Initec",
];

const DATE_FIN = "2026-12-31";

// 4 contrats récurrents (titulaire + modèle vides). Jours : lundi=1, mardi=2, jeudi=4.
const INITIAL_CONTRACTS = [
  { clientNom: "Fidupartner", joursSemaine: [2] }, // mardi
  { clientNom: "Sutra", joursSemaine: [1] }, // lundi
  { clientNom: "Upsilon Consulting", joursSemaine: [2] }, // mardi
  { clientNom: "Fluides Systèmes", joursSemaine: [4] }, // jeudi
];

const norm = (s) => (s || "").trim().toLowerCase();

function sameDays(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export async function importInitialData() {
  const dateDebut = toISODate(new Date()); // = aujourd'hui

  // ── 1. Techniciens ──
  const existingTechs = await listTechnicians();
  const techNames = new Set(existingTechs.map((t) => norm(t.nom)));
  const techniciansCreated = [];
  const techniciansSkipped = [];
  for (const t of TEMP_TECHNICIANS) {
    if (techNames.has(norm(t.nom))) {
      techniciansSkipped.push(t.nom);
      continue;
    }
    await createTechnician({ nom: t.nom, pin: t.pin });
    techniciansCreated.push({ nom: t.nom, pin: t.pin });
  }

  // ── 2. Clients ──
  let clients = await listClients();
  const clientNames = new Set(clients.map((c) => norm(c.nom)));
  const clientsCreated = [];
  const clientsSkipped = [];
  for (const nom of INITIAL_CLIENTS) {
    if (clientNames.has(norm(nom))) {
      clientsSkipped.push(nom);
      continue;
    }
    await createClient({ nom });
    clientsCreated.push(nom);
  }
  // Recharger pour disposer des id (notamment des clients fraîchement créés).
  clients = await listClients();
  const clientByName = Object.fromEntries(clients.map((c) => [norm(c.nom), c]));

  // ── 3. Contrats + génération des interventions ──
  const existingContracts = await listContracts();
  let contractsCreated = 0;
  let contractsSkipped = 0;
  let interventionsGenerated = 0;

  for (const def of INITIAL_CONTRACTS) {
    const client = clientByName[norm(def.clientNom)];
    if (!client) continue; // sécurité (ne devrait pas arriver)

    // Idempotence : un contrat existe déjà pour ce client + ces jours ?
    const match = existingContracts.find(
      (c) =>
        c.clientId === client.id &&
        sameDays(c.recurrenceRule?.joursSemaine, def.joursSemaine)
    );

    let contractId;
    let recurrenceRule;
    if (match) {
      contractsSkipped++;
      contractId = match.id;
      recurrenceRule = match.recurrenceRule;
    } else {
      contractId = await createContract({
        clientId: client.id,
        technicianId: "", // titulaire vide
        taskTemplateId: "", // modèle vide
        joursSemaine: def.joursSemaine,
        dateDebut,
        dateFin: DATE_FIN,
      });
      contractsCreated++;
      recurrenceRule = { joursSemaine: def.joursSemaine, dateDebut, dateFin: DATE_FIN };
    }

    // Génère (ou complète) les interventions du contrat — idempotent.
    const res = await syncContractInterventions({
      id: contractId,
      clientId: client.id,
      technicianId: "",
      taskTemplateId: "",
      recurrenceRule,
    });
    interventionsGenerated += res.created;
  }

  return {
    dateDebut,
    techniciansCreated,
    techniciansSkipped,
    clientsCreated,
    clientsSkipped,
    contractsCreated,
    contractsSkipped,
    interventionsGenerated,
  };
}
