// Notification email à la soumission d'une fiche.
// Appelle notre fonction serverless /api/send-intervention-email.
//
// ROBUSTESSE : cette fonction n'échoue JAMAIS de façon visible. Toute erreur
// (réseau, 404 en dev sans serverless, 500…) est seulement journalisée. La
// soumission de la fiche (déjà enregistrée dans Firestore AVANT cet appel) ne
// doit jamais être bloquée par l'email.
//
// App Check : cet appel vise NOTRE propre fonction Vercel, pas une API Firebase.
// App Check ne s'applique donc pas ici — l'appel n'est pas bloqué.
export async function notifyInterventionSubmitted(payload) {
  try {
    const res = await fetch("/api/send-intervention-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Notification email non envoyée (statut", res.status + "). Sans impact sur la fiche.");
    }
  } catch (e) {
    console.error("Notification email impossible (sans impact sur la fiche) :", e);
  }
}
