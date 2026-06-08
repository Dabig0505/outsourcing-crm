// Couche d'accès aux données "interventions".
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";

const interventionsRef = collection(db, COLLECTIONS.interventions);

// Récupère une intervention par son identifiant.
export async function getIntervention(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.interventions, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Liste TOUTES les interventions (pour l'historique admin), triées par date décroissante.
export async function listAllInterventions() {
  const snap = await getDocs(interventionsRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Liste TOUTES les interventions "à faire" (tous techniciens/contrats confondus),
// triées par date croissante. N'importe quel technicien peut les prendre (remplacements).
export async function listUpcoming() {
  const q = query(interventionsRef, where("statut", "==", "a_faire"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

// Liste les interventions réellement SOUMISES par un technicien donné (son historique),
// de la plus récente à la plus ancienne.
export async function listPastByTechnician(technicianId) {
  const q = query(interventionsRef, where("submittedBy", "==", technicianId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => msOf(b.submittedAt) - msOf(a.submittedAt));
}

// Soumission d'une fiche : passe au statut "fait" + horodatage + auteur réel.
export async function submitIntervention(
  id,
  { taskTemplateId, tasksDone, commentaireBrut, submittedBy }
) {
  await updateDoc(doc(db, COLLECTIONS.interventions, id), {
    statut: "fait",
    taskTemplateId: taskTemplateId || null,
    tasksDone, // [{ tache, detail }]
    commentaireBrut: commentaireBrut || "",
    // commentaireReformule : laissé vide (reformulation IA prévue plus tard).
    submittedAt: serverTimestamp(),
    submittedBy,
  });
}

// Création d'une intervention DÉJÀ RÉALISÉE (technicien qui fait + remplit d'un coup).
// Créée directement au statut "fait", source "ponctuel", avec horodatage et auteur.
export async function createCompletedIntervention({
  clientId,
  date,
  taskTemplateId,
  tasksDone,
  commentaireBrut,
  submittedBy,
}) {
  const ref = await addDoc(interventionsRef, {
    clientId,
    technicianId: null, // pas de titulaire : le technicien l'a faite lui-même
    date,
    statut: "fait",
    source: "ponctuel",
    contractId: null,
    taskTemplateId: taskTemplateId || null,
    tasksDone, // [{ tache, detail }]
    commentaireBrut: commentaireBrut || "",
    commentaireReformule: "",
    photos: [],
    submittedAt: serverTimestamp(),
    submittedBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Création d'une intervention (utilisé par le seed de test ; la génération
// automatique via les contrats viendra en Phase 5).
export async function createIntervention(data) {
  const ref = await addDoc(interventionsRef, {
    clientId: data.clientId,
    technicianId: data.technicianId || null,
    date: data.date,
    statut: data.statut || "a_faire",
    source: data.source || "ponctuel",
    contractId: data.contractId || null,
    taskTemplateId: data.taskTemplateId || null,
    tasksDone: data.tasksDone || [],
    commentaireBrut: data.commentaireBrut || "",
    commentaireReformule: data.commentaireReformule || "",
    photos: [],
    submittedAt: data.submittedAt || null,
    submittedBy: data.submittedBy || null,
    createdAt: serverTimestamp(),
    ...(data.isTest ? { isTest: true } : {}),
  });
  return ref.id;
}

// Convertit un Timestamp Firestore (ou null) en millisecondes pour le tri.
function msOf(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return 0;
}
