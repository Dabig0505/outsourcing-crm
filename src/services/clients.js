// Couche d'accès aux données "clients".
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

const clientsRef = collection(db, COLLECTIONS.clients);

// Liste tous les clients, triés par nom.
export async function listClients() {
  const snap = await getDocs(clientsRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"));
}

// Récupère un client par son identifiant.
export async function getClient(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.clients, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Crée un client. Seul le nom est obligatoire.
export async function createClient({ nom, contact, email, telephone, adresse }) {
  const ref = await addDoc(clientsRef, {
    nom: nom.trim(),
    contact: (contact || "").trim(),
    email: (email || "").trim(),
    telephone: (telephone || "").trim(),
    adresse: (adresse || "").trim(),
    actif: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Met à jour les informations d'un client.
export async function updateClient(id, { nom, contact, email, telephone, adresse }) {
  await updateDoc(doc(db, COLLECTIONS.clients, id), {
    nom: nom.trim(),
    contact: (contact || "").trim(),
    email: (email || "").trim(),
    telephone: (telephone || "").trim(),
    adresse: (adresse || "").trim(),
  });
}

// Archive ou réactive un client (on ne supprime pas, pour préserver l'historique).
export async function setClientActive(id, actif) {
  await updateDoc(doc(db, COLLECTIONS.clients, id), { actif });
}
