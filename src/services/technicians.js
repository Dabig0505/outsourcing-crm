// Couche d'accès aux données "techniciens" : toutes les opérations Firestore
// liées aux techniciens sont regroupées ici (le reste de l'app appelle ces fonctions).
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";
import { hashPin } from "../utils/pin";

const techniciansRef = collection(db, COLLECTIONS.technicians);

// Liste tous les techniciens, triés par nom (ordre alphabétique).
export async function listTechnicians() {
  const snap = await getDocs(techniciansRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
}

// Récupère un technicien par son identifiant.
export async function getTechnician(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.technicians, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Crée un technicien. Le PIN est haché avant stockage (jamais en clair).
export async function createTechnician({ nom, pin }) {
  const ref = await addDoc(techniciansRef, {
    nom: nom.trim(),
    pinHash: hashPin(pin),
    actif: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Modifie le nom d'un technicien.
export async function updateTechnicianName(id, nom) {
  await updateDoc(doc(db, COLLECTIONS.technicians, id), { nom: nom.trim() });
}

// Réinitialise le PIN d'un technicien (re-haché).
export async function updateTechnicianPin(id, pin) {
  await updateDoc(doc(db, COLLECTIONS.technicians, id), { pinHash: hashPin(pin) });
}

// Active ou désactive un technicien (on ne supprime pas, pour garder l'historique).
export async function setTechnicianActive(id, actif) {
  await updateDoc(doc(db, COLLECTIONS.technicians, id), { actif });
}
