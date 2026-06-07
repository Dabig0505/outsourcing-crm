// Couche d'accès aux données "modèles de tâches".
// Un modèle regroupe un nom et une liste de libellés de tâches (cases à cocher
// qui pré-rempliront les fiches d'intervention).
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

const templatesRef = collection(db, COLLECTIONS.taskTemplates);

// Nettoie la liste : enlève les espaces et les lignes vides.
function cleanTasks(tasks) {
  return (tasks || []).map((t) => t.trim()).filter((t) => t.length > 0);
}

export async function listTaskTemplates() {
  const snap = await getDocs(templatesRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
}

export async function createTaskTemplate({ nom, tasks }) {
  const ref = await addDoc(templatesRef, {
    nom: nom.trim(),
    tasks: cleanTasks(tasks),
    actif: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTaskTemplate(id, { nom, tasks }) {
  await updateDoc(doc(db, COLLECTIONS.taskTemplates, id), {
    nom: nom.trim(),
    tasks: cleanTasks(tasks),
  });
}

// Archive ou réactive un modèle (on ne supprime pas : il peut être lié à des contrats).
export async function setTaskTemplateActive(id, actif) {
  await updateDoc(doc(db, COLLECTIONS.taskTemplates, id), { actif });
}
