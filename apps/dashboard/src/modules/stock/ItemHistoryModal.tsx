import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import type { ApiMovement } from "../../lib/stockApi";
import { fetchMovements } from "../../lib/stockApi";
import { formatDate, formatQuantity } from "../../lib/format";
import { ApiError } from "../../lib/api";

export function ItemHistoryModal({ itemId, itemName, itemUnit, onClose }: { itemId: string; itemName: string; itemUnit: string; onClose: () => void }) {
  const [history, setHistory] = useState<ApiMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovements(itemId)
      .then(setHistory)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger l'historique."));
  }, [itemId]);

  return (
    <Modal title={`Historique — ${itemName}`} onClose={onClose} width={620} footer={<Button onClick={onClose}>Fermer</Button>}>
      {error ? (
        <p className="form-error">{error}</p>
      ) : history === null ? (
        <p className="loading-text">Chargement…</p>
      ) : history.length === 0 ? (
        <p className="field-hint" style={{ margin: 0 }}>
          Aucun mouvement enregistré pour cet article.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mouvement</th>
                <th>Quantité</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => (
                <tr key={m.id}>
                  <td className="tabular">{formatDate(m.date)}</td>
                  <td>
                    <Pill tone={m.direction === "IN" ? "ok" : "neutral"}>{m.direction === "IN" ? "Entrée" : "Sortie"}</Pill>
                  </td>
                  <td className="tabular">
                    {m.direction === "IN" ? "+" : "−"}
                    {formatQuantity(m.quantity, itemUnit)}
                  </td>
                  <td className="history-detail">
                    {m.direction === "IN" ? (m.supplier?.name ?? "—") : (m.reason ?? "—")}
                    {m.batch ? <span className="history-batch"> · lot {m.batch.batchNumber}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
