// Couche d'accès aux données "contrats" (interventions récurrentes).
// NB : la GÉNÉRATION des interventions à partir d'un contrat se fera en Phase 5.
// Ici on ne gère que l'enregistrement du contrat lui-même.
import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";

const contractsRef = collection(db, COLLECTIONS.contracts);

export async function listContracts() {
  const snap = await getDocs(contractsRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createContract({
  clientId,
  technicianId,
  taskTemplateId,
  joursSemaine,
  dateDebut,
  dateFin,
}) {
  const ref = await addDoc(contractsRef, {
    clientId,
    technicianId,
    taskTemplateId,
    recurrenceRule: { joursSemaine, dateDebut, dateFin },
    actif: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContract(
  id,
  { clientId, technicianId, taskTemplateId, joursSemaine, dateDebut, dateFin }
) {
  await updateDoc(doc(db, COLLECTIONS.contracts, id), {
    clientId,
    technicianId,
    taskTemplateId,
    recurrenceRule: { joursSemaine, dateDebut, dateFin },
  });
}

export async function setContractActive(id, actif) {
  await updateDoc(doc(db, COLLECTIONS.contracts, id), { actif });
}
