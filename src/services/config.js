// Accès au document de configuration de l'entreprise (config/app).
// Contient les coordonnées utilisées dans l'en-tête des PDF.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";

const CONFIG_DOC = doc(db, COLLECTIONS.config, "app");

const DEFAULT_ENTREPRISE = {
  nom: "Outsourcing Support",
  adresse: "",
  telephone: "",
  email: "",
  logo: "",
};

// Récupère les infos entreprise (avec valeurs par défaut si absentes).
export async function getEntreprise() {
  const snap = await getDoc(CONFIG_DOC);
  return { ...DEFAULT_ENTREPRISE, ...(snap.exists() ? snap.data().entreprise : {}) };
}

// Met à jour les infos entreprise.
export async function updateEntreprise(entreprise) {
  await setDoc(CONFIG_DOC, { entreprise }, { merge: true });
}
