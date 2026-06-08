// Génération d'un PDF propre d'une fiche d'intervention (100% côté navigateur).
// L'admin télécharge le fichier et l'envoie lui-même au client.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateFR } from "./recurrence";
import { isNewFormat, modeLabel } from "./intervention";

// Charge le logo (public/logo.png) et le convertit en base64 via un canvas.
// Fiable en production (même origine que l'app, pas de Firebase Storage requis).
// Le résultat est mis en cache pour ne le charger qu'une fois.
let logoPromise = null;
function getLogoDataURL() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null); // en cas de souci, on génère le PDF sans logo
        }
      };
      img.onerror = () => resolve(null);
      img.src = "/logo.png";
    });
  }
  return logoPromise;
}

// Formate un Timestamp Firestore (ou Date) en date+heure lisible.
function formatTimestamp(ts) {
  if (!ts) return "";
  const d = typeof ts.toDate === "function" ? ts.toDate() : ts instanceof Date ? ts : null;
  return d ? d.toLocaleString("fr-FR") : "";
}

// Nettoie une chaîne pour en faire un nom de fichier sûr.
function safeName(s) {
  return (s || "fiche").replace(/[^\w\-]+/g, "_");
}

export async function generateInterventionPDF({
  intervention,
  client,
  technicien, // technicien ayant soumis (submittedBy)
  titulaire, // technicien titulaire (indicatif)
  entreprise,
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  // ── En-tête : logo (le nom est déjà dans l'image) + coordonnées entreprise ──
  const logo = await getLogoDataURL();
  const LOGO_SIZE = 120; // logo carré agrandi (~160 px de large)
  const coords = [entreprise?.adresse, entreprise?.telephone, entreprise?.email].filter(Boolean);

  if (logo) {
    // Le nom de l'entreprise figure déjà dans le logo : on n'écrit pas le texte.
    doc.addImage(logo, "PNG", margin, y, LOGO_SIZE, LOGO_SIZE);
    let ty = y + 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    coords.forEach((line) => {
      doc.text(String(line), margin + LOGO_SIZE + 16, ty);
      ty += 12;
    });
    doc.setTextColor(0);
    y = Math.max(y + LOGO_SIZE, ty) + 8;
  } else {
    // Repli si le logo ne se charge pas : on affiche le nom + coordonnées.
    let ty = y + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(entreprise?.nom || "Outsourcing Support", margin, ty);
    ty += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    coords.forEach((line) => {
      doc.text(String(line), margin, ty);
      ty += 12;
    });
    doc.setTextColor(0);
    y = ty + 8;
  }

  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // ── Titre ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Fiche d'intervention", margin, y);
  y += 24;

  // ── Bloc d'informations ──
  const nouveau = isNewFormat(intervention);
  doc.setFontSize(10);
  const info = [
    ["Client", client?.nom || "—"],
    ["Adresse", client?.adresse || "—"],
    ["Date", formatDateFR(intervention.date) || "—"],
  ];
  if (nouveau) {
    if (intervention.type) info.push(["Type", intervention.type]);
    info.push(["Mode", modeLabel(intervention.mode) || "—"]);
  }
  info.push(["Technicien", technicien?.nom || titulaire?.nom || "—"]);
  info.push(["Statut", intervention.statut === "fait" ? "Réalisée" : "À faire"]);

  info.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k} :`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), margin + 90, y);
    y += 16;
  });
  y += 8;

  if (nouveau) {
    // ── NOUVEAU format : description (texte libre) ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Description de l'intervention", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const txt = intervention.description || intervention.commentaireBrut || "—";
    const lines = doc.splitTextToSize(txt, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 12;
  } else {
    // ── ANCIEN format : tableau des tâches + commentaire ──
    const rows = (intervention.tasksDone || []).map((t) => [t.tache, t.detail || ""]);
    autoTable(doc, {
      startY: y,
      head: [["Tâche réalisée", "Détail"]],
      body: rows.length ? rows : [["Aucune tâche renseignée", ""]],
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 6, valign: "top" },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 250 } },
    });
    y = doc.lastAutoTable.finalY + 22;

    if (intervention.commentaireBrut) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Commentaire", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(intervention.commentaireBrut, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 13 + 12;
    }
  }

  // ── Pied : traçabilité de la soumission ──
  const submitted = formatTimestamp(intervention.submittedAt);
  if (submitted) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
      `Soumise le ${submitted}${technicien?.nom ? " par " + technicien.nom : ""}.`,
      margin,
      y
    );
    doc.setTextColor(0);
  }

  doc.save(`fiche-${safeName(client?.nom)}-${intervention.date || ""}.pdf`);
}
