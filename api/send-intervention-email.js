// Fonction serverless Vercel : envoie un email à chaque soumission de fiche.
// Appelée par le navigateur (POST JSON) au moment de la soumission.
// La clé API Resend et les adresses sont lues depuis l'environnement — JAMAIS
// dans le code, JAMAIS exposées au client (pas de préfixe VITE_).
//
// ─── Configuration (à régler dans les variables d'environnement Vercel) ───
//   RESEND_API_KEY   : clé API Resend (secrète, obligatoire)
//   EMAIL_RECIPIENT  : destinataire (obligatoire). Test : votre email de compte Resend.
//                      Demain : a.megouar@outsourcing-support.com
//   EMAIL_FROM       : expéditeur. Par défaut "onboarding@resend.dev" (test Resend).
//                      Demain : interventions@outsourcing-support.com (domaine vérifié)
//   APP_URL          : lien vers l'app (par défaut le domaine Vercel actuel)
// Pour basculer en prod, il suffit de changer EMAIL_FROM et EMAIL_RECIPIENT (1 ligne chacun).

const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const TO = process.env.EMAIL_RECIPIENT || "";
const APP_URL = process.env.APP_URL || "https://outsourcing-crm-one.vercel.app";

const MODE_LABELS = { sur_site: "Sur site", a_distance: "À distance" };

// "AAAA-MM-JJ" -> "JJ/MM/AAAA"
function formatDateFR(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !TO) {
    console.error("Config email incomplète : RESEND_API_KEY ou EMAIL_RECIPIENT manquant.");
    return res.status(500).json({ error: "Email non configuré" });
  }

  // Corps de la requête (parsé automatiquement par Vercel ; sécurité si chaîne).
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const clientNom = body.clientNom || "Client";
  const dateFR = formatDateFR(body.date);
  const technicienNom = body.technicienNom || "—";
  const type = body.type || "—";
  const modeLabel = MODE_LABELS[body.mode] || "—";
  const description = body.description || "";
  const submittedAt = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" });

  const subject = `Nouvelle fiche d'intervention - ${clientNom} - ${dateFR}`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
    <h2 style="margin:0 0 4px">Nouvelle fiche d'intervention</h2>
    <p style="margin:0 0 16px;color:#64748b">Soumise le ${escapeHtml(submittedAt)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 8px;font-weight:bold;width:160px;background:#f8fafc">Client</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${escapeHtml(clientNom)}</td></tr>
      <tr><td style="padding:6px 8px;font-weight:bold;background:#f8fafc">Date</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${escapeHtml(dateFR)}</td></tr>
      <tr><td style="padding:6px 8px;font-weight:bold;background:#f8fafc">Technicien</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${escapeHtml(technicienNom)}</td></tr>
      <tr><td style="padding:6px 8px;font-weight:bold;background:#f8fafc">Type d'intervention</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${escapeHtml(type)}</td></tr>
      <tr><td style="padding:6px 8px;font-weight:bold;background:#f8fafc">Mode</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${escapeHtml(modeLabel)}</td></tr>
    </table>
    <h3 style="margin:18px 0 6px">Description</h3>
    <p style="white-space:pre-wrap;font-size:14px;line-height:1.5;background:#f8fafc;padding:12px;border-radius:8px">${escapeHtml(description) || "—"}</p>
    <p style="margin-top:20px">
      <a href="${APP_URL}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">
        Ouvrir l'application (consulter / télécharger le PDF)
      </a>
    </p>
    <p style="color:#94a3b8;font-size:12px;margin-top:20px">Outsourcing Support — notification automatique.</p>
  </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: TO, subject, html }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend erreur:", r.status, detail);
      return res.status(502).json({ error: "Envoi échoué" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Erreur d'envoi email:", e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
