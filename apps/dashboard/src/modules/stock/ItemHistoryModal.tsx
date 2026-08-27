import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import type { Item } from "../../lib/types";
import { useStock } from "../../state/StockContext";
import { getItemMovements } from "../../lib/stockEngine";
import { formatDate, formatQuantity } from "../../lib/format";

export function ItemHistoryModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const { movements, batches } = useStock();
  const history = getItemMovements(movements, item.id);
  const batchNumber = (id: string | null) => (id ? batches.find((b) => b.id === id)?.batchNumber ?? "—" : null);

  return (
    <Modal title={`Historique — ${item.name}`} onClose={onClose} width={620} footer={<Button onClick={onClose}>Fermer</Button>}>
      {history.length === 0 ? (
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
                  <Pill tone={m.direction === "in" ? "ok" : "neutral"}>{m.direction === "in" ? "Entrée" : "Sortie"}</Pill>
                </td>
                <td className="tabular">
                  {m.direction === "in" ? "+" : "−"}
                  {formatQuantity(m.quantity, item.unit)}
                </td>
                <td className="history-detail">
                  {m.direction === "in" ? m.supplierName ?? "—" : m.reason ?? "—"}
                  {batchNumber(m.batchId) ? <span className="history-batch"> · lot {batchNumber(m.batchId)}</span> : null}
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
