// Script de DÉVELOPPEMENT : crée quelques interventions "à faire" de test,
// pour pouvoir essayer l'écran technicien avant la génération auto (Phase 5).
//
// Lancement :  node --env-file=.env scripts/seed-test-interventions.mjs
//
// Les interventions créées portent le champ isTest:true, pour les repérer/supprimer
// facilement plus tard dans la console Firebase.
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

async function fetchAll(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const clients = (await fetchAll("clients")).filter((c) => c.actif !== false);
const technicians = (await fetchAll("technicians")).filter((t) => t.actif !== false);
const templates = (await fetchAll("taskTemplates")).filter((t) => t.actif !== false);

if (clients.length === 0) {
  console.log("❌ Aucun client en base. Créez d'abord un client dans l'espace admin.");
  process.exit(1);
}

const pick = (arr, i) => (arr.length ? arr[i % arr.length] : null);
const byName = (arr, n) => arr.find((x) => x.nom === n);

// 3 interventions de test, avec un peu de variété.
const samples = [
  {
    client: clients[0],
    titulaire: pick(technicians, 0),
    template: byName(templates, "Maintenance informatique") || pick(templates, 0),
    date: "2026-06-08",
  },
  {
    client: pick(clients, 1),
    titulaire: pick(technicians, 1),
    template: byName(templates, "Réparation imprimante") || pick(templates, 1),
    date: "2026-06-10",
  },
  {
    client: clients[0],
    titulaire: null, // titulaire non défini -> "non défini" sur la fiche
    template: null, // aucun modèle suggéré -> le technicien choisira
    date: "2026-06-12",
  },
];

let created = 0;
for (const s of samples) {
  await addDoc(collection(db, "interventions"), {
    clientId: s.client.id,
    technicianId: s.titulaire?.id || null,
    date: s.date,
    statut: "a_faire",
    source: "ponctuel",
    contractId: null,
    taskTemplateId: s.template?.id || null,
    tasksDone: [],
    commentaireBrut: "",
    commentaireReformule: "",
    photos: [],
    submittedAt: null,
    submittedBy: null,
    isTest: true,
    createdAt: serverTimestamp(),
  });
  created++;
  console.log(
    `✅ ${s.date} — ${s.client.nom} — titulaire: ${s.titulaire?.nom || "non défini"} — modèle: ${s.template?.nom || "aucun"}`
  );
}

console.log(`\n${created} intervention(s) de test créée(s).`);
process.exit(0);
