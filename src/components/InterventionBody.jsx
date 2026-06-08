// Affichage lecture seule du contenu d'une intervention, gérant les DEUX formats :
//   - NOUVEAU : Type + Mode + Description
//   - ANCIEN  : liste des tâches cochées (tasksDone) + commentaire
// Utilisé côté technicien (consultation) et côté admin (détail historique).
import { isNewFormat, modeLabel } from "../utils/intervention";

export default function InterventionBody({ intervention }) {
  if (isNewFormat(intervention)) {
    return (
      <div className="space-y-4">
        {intervention.type && (
          <Block titre="Type d'intervention">{intervention.type}</Block>
        )}
        <Block titre="Mode d'intervention">{modeLabel(intervention.mode)}</Block>
        <Block titre="Description">
          <p className="whitespace-pre-wrap text-slate-700">
            {intervention.description || "—"}
          </p>
        </Block>
      </div>
    );
  }

  // Ancien format : tâches cochées + commentaire.
  const tasks = intervention.tasksDone || [];
  return (
    <div className="space-y-4">
      <Block titre="Tâches réalisées">
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune tâche renseignée.</p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((t, i) => (
              <li key={i} className="flex gap-2 text-slate-700">
                <span className="text-emerald-600">✓</span>
                <div>
                  <div>{t.tache}</div>
                  {t.detail && <div className="text-sm text-slate-500">{t.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Block>
      {intervention.commentaireBrut && (
        <Block titre="Commentaire">
          <p className="whitespace-pre-wrap text-slate-700">{intervention.commentaireBrut}</p>
        </Block>
      )}
    </div>
  );
}

function Block({ titre, children }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-700">{titre}</h3>
      {typeof children === "string" ? (
        <p className="text-slate-700">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}
