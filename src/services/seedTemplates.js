// Pré-remplissage (seed) de la base avec des modèles de tâches par défaut,
// exécuté UNE SEULE FOIS à la première utilisation.
//
// Sécurités :
//   - Un drapeau `seededDefaultTemplates` dans config/app évite de re-semer à
//     chaque chargement (même si l'admin supprime/archive des modèles ensuite).
//   - On n'ajoute un modèle par défaut QUE si aucun modèle ne porte déjà ce nom,
//     pour ne jamais créer de doublon ni écraser un modèle créé manuellement.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../firebase/collections";

const CONFIG_DOC = doc(db, COLLECTIONS.config, "app");

export const DEFAULT_TEMPLATES = [
  {
    nom: "Maintenance informatique",
    tasks: [
      "Vérifier l'antivirus et les signatures",
      "Installer les mises à jour Windows",
      "Nettoyer les fichiers temporaires et le disque",
      "Vérifier l'espace disque disponible",
      "Contrôler le démarrage et les performances",
      "Dépoussiérer physiquement l'unité",
      "Vérifier les sauvegardes locales",
      "Tester la connexion réseau du poste",
      "Mettre à jour les pilotes",
      "Vérifier les périphériques",
      "Contrôler les comptes utilisateurs",
    ],
  },
  {
    nom: "Réparation imprimante",
    tasks: [
      "Diagnostic de la panne",
      "Remplacement du toner/cartouche",
      "Nettoyage des rouleaux d'entraînement",
      "Retrait de bourrage papier",
      "Nettoyage des têtes d'impression",
      "Vérification de la connexion (USB/réseau/Wi-Fi)",
      "Réinstallation des pilotes",
      "Calibration des couleurs",
      "Test d'impression recto-verso",
      "Mise à jour du firmware",
      "Vérification du bac et des consommables",
    ],
  },
  {
    nom: "Installation / intervention réseau",
    tasks: [
      "Câblage et brassage",
      "Configuration de la box/routeur",
      "Paramétrage du Wi-Fi",
      "Installation d'un switch",
      "Configuration des VLAN",
      "Test de débit et de connectivité",
      "Configuration d'adresses IP fixes",
      "Installation d'un point d'accès",
      "Vérification de la baie de brassage",
      "Sécurisation du réseau (pare-feu)",
      "Étiquetage des câbles",
    ],
  },
  {
    nom: "Maintenance serveur",
    tasks: [
      "Vérifier l'état des disques (RAID)",
      "Contrôler les sauvegardes serveur",
      "Installer les mises à jour système",
      "Vérifier les journaux d'événements",
      "Contrôler la température et la ventilation",
      "Vérifier l'espace de stockage",
      "Tester l'onduleur (UPS)",
      "Contrôler les services critiques",
      "Vérifier les accès et permissions",
      "Redémarrage planifié si nécessaire",
      "Contrôle de l'antivirus serveur",
    ],
  },
  {
    nom: "Installation poste de travail",
    tasks: [
      "Déballage et montage",
      "Installation du système d'exploitation",
      "Configuration du compte utilisateur",
      "Installation des logiciels métier",
      "Connexion au réseau et au domaine",
      "Configuration de la messagerie",
      "Installation de l'imprimante réseau",
      "Transfert des données de l'ancien poste",
      "Configuration des sauvegardes",
      "Test général",
      "Formation rapide de l'utilisateur",
    ],
  },
  {
    nom: "Support utilisateur / dépannage",
    tasks: [
      "Diagnostic du problème signalé",
      "Résolution d'un souci logiciel",
      "Déblocage de session/mot de passe",
      "Configuration de la messagerie",
      "Résolution d'un problème d'impression",
      "Suppression de virus/malware",
      "Récupération de données",
      "Assistance sur logiciel métier",
      "Configuration d'un accès distant",
      "Documentation de l'intervention",
    ],
  },
  {
    nom: "Vidéosurveillance / sécurité",
    tasks: [
      "Installation de caméra",
      "Configuration de l'enregistreur (NVR/DVR)",
      "Paramétrage de l'accès distant",
      "Réglage des angles de vue",
      "Test de l'enregistrement",
      "Vérification du stockage",
      "Configuration des alertes",
      "Maintenance des caméras existantes",
      "Vérification du câblage",
      "Contrôle de la qualité d'image",
    ],
  },
];

// Garde-fou : si la fonction est appelée plusieurs fois rapidement (ex : React
// exécute les effets deux fois en mode développement), on réutilise la même
// exécution au lieu d'en lancer une seconde en parallèle (qui créerait des doublons).
let inFlight = null;
export function seedDefaultTemplatesOnce() {
  if (!inFlight) inFlight = runSeed();
  return inFlight;
}

// Sème les modèles par défaut une seule fois. Renvoie le nombre de modèles ajoutés.
async function runSeed() {
  // Déjà fait précédemment ? On ne refait rien.
  const cfgSnap = await getDoc(CONFIG_DOC);
  if (cfgSnap.exists() && cfgSnap.data().seededDefaultTemplates) {
    return { seeded: 0, alreadyDone: true };
  }

  // Noms des modèles déjà présents (pour éviter les doublons).
  const existingSnap = await getDocs(collection(db, COLLECTIONS.taskTemplates));
  const existingNames = new Set(
    existingSnap.docs.map((d) => (d.data().nom || "").trim().toLowerCase())
  );

  const batch = writeBatch(db);
  let seeded = 0;

  for (const tpl of DEFAULT_TEMPLATES) {
    if (existingNames.has(tpl.nom.trim().toLowerCase())) continue; // déjà créé manuellement
    const ref = doc(collection(db, COLLECTIONS.taskTemplates));
    batch.set(ref, {
      nom: tpl.nom,
      tasks: tpl.tasks,
      actif: true,
      isDefault: true,
      createdAt: serverTimestamp(),
    });
    seeded++;
  }

  // On marque le seed comme fait (crée config/app s'il n'existe pas encore).
  batch.set(CONFIG_DOC, { seededDefaultTemplates: true }, { merge: true });
  await batch.commit();

  return { seeded };
}
