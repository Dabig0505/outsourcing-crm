// Génération d'un PDF propre d'une fiche d'intervention (100% côté navigateur).
// L'admin télécharge le fichier et l'envoie lui-même au client.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateFR } from "./recurrence";

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

export function generateInterventionPDF({
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

  // ── En-tête entreprise ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(entreprise?.nom || "Outsourcing Support", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  [entreprise?.adresse, entreprise?.telephone, entreprise?.email]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(String(line), margin, y);
      y += 12;
    });
  doc.setTextColor(0);

  // Ligne de séparation
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // ── Titre ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Fiche d'intervention", margin, y);
  y += 24;

  // ── Bloc d'informations ──
  doc.setFontSize(10);
  const info = [
    ["Client", client?.nom || "—"],
    ["Adresse", client?.adresse || "—"],
    ["Date", formatDateFR(intervention.date) || "—"],
    ["Technicien", technicien?.nom || titulaire?.nom || "—"],
    ["Statut", intervention.statut === "fait" ? "Réalisée" : "À faire"],
  ];
  info.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k} :`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), margin + 90, y);
    y += 16;
  });
  y += 8;

  // ── Tableau des tâches réalisées ──
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

  // ── Commentaire général ──
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
