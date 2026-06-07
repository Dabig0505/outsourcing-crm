// Génération des interventions à partir d'un contrat récurrent (côté client,
// sans Cloud Function). Réutilise computeOccurrenceDates (déjà testé).
//
// La fonction est SYNCHRONISANTE et idempotente :
//   - crée les interventions des nouvelles dates,
//   - supprime les interventions "à faire" dont la date a disparu du planning,
//   - met à jour le titulaire/modèle des interventions "à faire" restantes,
//   - ne touche JAMAIS aux interventions déjà "fait" (historique préservé).
// On peut donc l'appeler à la création comme à la modification d'un contrat.
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";
import { computeOccurrenceDates } from "../utils/recurrence";

const interventionsRef = collection(db, COLLECTIONS.interventions);
const BATCH_LIMIT = 450; // marge sous la limite Firestore de 500 opérations/lot.

// Découpe une liste d'opérations et les valide en plusieurs lots.
async function commitInChunks(applyOps, count) {
  for (let i = 0; i < count; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    applyOps(batch, i, Math.min(i + BATCH_LIMIT, count));
    await batch.commit();
  }
}

// Modèle de document pour une occurrence générée.
function newInterventionData(contract, date) {
  return {
    clientId: contract.clientId,
    technicianId: contract.technicianId || null, // titulaire (indicatif)
    date,
    statut: "a_faire",
    source: "recurrent",
    contractId: contract.id,
    taskTemplateId: contract.taskTemplateId || null, // modèle suggéré
    tasksDone: [],
    commentaireBrut: "",
    commentaireReformule: "",
    photos: [],
    submittedAt: null,
    submittedBy: null,
    createdAt: serverTimestamp(),
  };
}

// Synchronise les interventions d'un contrat. Renvoie { created, deleted, updated, total }.
export async function syncContractInterventions(contract) {
  const rule = contract.recurrenceRule || {};
  const targetDates = computeOccurrenceDates(
    rule.joursSemaine,
    rule.dateDebut,
    rule.dateFin
  );
  const targetSet = new Set(targetDates);

  // Interventions déjà rattachées à ce contrat.
  const snap = await getDocs(query(interventionsRef, where("contractId", "==", contract.id)));
  const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const existingDates = new Set(existing.map((e) => e.date));

  // À créer : dates cibles sans intervention existante.
  const toCreate = targetDates.filter((d) => !existingDates.has(d));
  // À supprimer : interventions "à faire" dont la date n'est plus au planning.
  const toDelete = existing.filter(
    (e) => e.statut === "a_faire" && !targetSet.has(e.date)
  );
  // À mettre à jour : interventions "à faire" conservées (titulaire/modèle peuvent avoir changé).
  const toUpdate = existing.filter(
    (e) => e.statut === "a_faire" && targetSet.has(e.date)
  );

  const tech = contract.technicianId || null;
  const tpl = contract.taskTemplateId || null;

  // 1) Créations
  await commitInChunks((batch, from, to) => {
    for (let i = from; i < to; i++) {
      batch.set(doc(interventionsRef), newInterventionData(contract, toCreate[i]));
    }
  }, toCreate.length);

  // 2) Suppressions
  await commitInChunks((batch, from, to) => {
    for (let i = from; i < to; i++) {
      batch.delete(doc(db, COLLECTIONS.interventions, toDelete[i].id));
    }
  }, toDelete.length);

  // 3) Mises à jour (titulaire + modèle suggéré)
  await commitInChunks((batch, from, to) => {
    for (let i = from; i < to; i++) {
      batch.update(doc(db, COLLECTIONS.interventions, toUpdate[i].id), {
        technicianId: tech,
        taskTemplateId: tpl,
      });
    }
  }, toUpdate.length);

  return {
    created: toCreate.length,
    deleted: toDelete.length,
    updated: toUpdate.length,
    total: targetDates.length,
  };
}

// Retire les interventions "à faire" d'un contrat (utilisé à l'archivage).
// Les interventions déjà "fait" sont conservées. Renvoie le nombre supprimé.
export async function removePlannedForContract(contractId) {
  const snap = await getDocs(query(interventionsRef, where("contractId", "==", contractId)));
  const planned = snap.docs.filter((d) => d.data().statut === "a_faire");

  await commitInChunks((batch, from, to) => {
    for (let i = from; i < to; i++) {
      batch.delete(doc(db, COLLECTIONS.interventions, planned[i].id));
    }
  }, planned.length);

  return planned.length;
}
