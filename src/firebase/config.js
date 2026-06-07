// Initialisation de Firebase (Firestore uniquement).
// NOTE : Firebase Storage n'est PAS activé (il exige le plan payant Blaze).
//   -> Pas d'upload de photos dans ce MVP. Le champ `photos` reste prévu
//      dans le modèle de données, on activera Storage plus tard si besoin.
// Les clés sont lues depuis le fichier .env (jamais écrites en dur dans le code).
// Voir .env.example pour la liste des variables à renseigner.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// ── App Check ──
// Atteste que les requêtes viennent bien de CETTE application (jeton reCAPTCHA v3).
// Tant que la clé reCAPTCHA n'est pas renseignée (VITE_RECAPTCHA_SITE_KEY), App Check
// reste inactif pour ne pas bloquer le développement. Voir README (section Sécurité).
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaSiteKey) {
  // En développement, un jeton de debug évite d'avoir besoin de reCAPTCHA en local.
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN &&
    typeof self !== "undefined"
  ) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// Base de données, utilisée partout dans l'app.
export const db = getFirestore(app);

export default app;
