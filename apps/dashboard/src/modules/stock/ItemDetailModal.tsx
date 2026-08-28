import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import type { ApiBatch, ApiItem, ApiMovement } from "../../lib/stockApi";
import { fetchBatches, fetchMovements } from "../../lib/stockApi";
import { formatCurrency, formatDate, formatQuantity, formatNumber } from "../../lib/format";
import { ApiError } from "../../lib/api";

function StockPill({ status, low }: { status: ApiItem["stockStatus"]; low: boolean }) {
  if (low) {
    return (
      <Pill tone="danger">
        Faible · à réapprovisionner
      </Pill>
    );
  }
  if (status === "mid") return <Pill tone="warn">Moyen</Pill>;
  return <Pill tone="ok">Bien</Pill>;
}

function ExpiryPill({ batch }: { batch: ApiBatch }) {
  if (batch.status === "expired") return <Pill tone="danger">Périmé</Pill>;
  if (batch.status === "warning") return <Pill tone="warn">Expire le {formatDate(batch.expiryDate!)}</Pill>;
  if (batch.status === "ok") return <span className="field-hint">exp. {formatDate(batch.expiryDate!)}</span>;
  return <span className="field-hint">Sans péremption</span>;
}

function CriticalityPill({ value }: { value: string }) {
  const tone = value === "Haute" ? "danger" : value === "Moyenne" ? "warn" : value === "Basse" ? "ok" : "neutral";
  return <Pill tone={tone}>{value}</Pill>;
}

function MaintenanceDetail({ m }: { m: ApiMovement }) {
  const bits = [m.machine, m.maintenanceRef && `réf. ${m.maintenanceRef}`, m.employee, m.notes].filter(Boolean) as string[];
  if (bits.length === 0) return null;
  return <div className="history-maintenance">{bits.join(" · ")}</div>;
}

function QualityTag({ m, hasQuality }: { m: ApiMovement; hasQuality: boolean }) {
  if (!hasQuality) return null;
  if (!m.quality) {
    return m.direction === "IN" ? <span className="history-batch"> · entrée non classée</span> : null;
  }
  const label = m.quality === "1er" ? "1er choix" : m.quality === "2ème" ? "2ème choix" : m.quality === "rebut" ? "rebut" : m.quality;
  const tone = m.quality === "1er" ? "ok" : m.quality === "2ème" ? "warn" : m.quality === "rebut" ? "neutral" : "danger";
  return (
    <>
      {" "}
      <Pill tone={tone}>{label}</Pill>
    </>
  );
}

function QualityCard({ label, value, tone, hint }: { label: string; value: string; tone: "ok" | "warn" | "neutral" | "danger"; hint: string }) {
  return (
    <div className="quality-card">
      <span className="quality-card-label">
        <Pill tone={tone}>{label}</Pill>
      </span>
      <span className="quality-card-value">{value}</span>
      <span className="quality-card-hint">{hint}</span>
    </div>
  );
}

export function ItemDetailModal({ item, onClose }: { item: ApiItem; onClose: () => void }) {
  const [batches, setBatches] = useState<ApiBatch[] | null>(null);
  const [movements, setMovements] = useState<ApiMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasBatches = item.inventoryType.hasBatches;
  const nextLabel = item.inventoryType.hasExpiry ? "Prochain lot (FEFO)" : "Prochain lot (FIFO)";

  useEffect(() => {
    Promise.all([fetchBatches(item.id), fetchMovements(item.id)])
      .then(([b, m]) => {
        setBatches(b);
        setMovements(m);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger le détail."));
  }, [item.id]);

  const supplierByBatch = new Map<string, string>();
  for (const m of movements ?? []) {
    if (m.direction === "IN" && m.batchId && m.supplier && !supplierByBatch.has(m.batchId)) {
      supplierByBatch.set(m.batchId, m.supplier.name);
    }
  }

  const nextBatch = item.recommendedBatch ?? item.fifoBatch;

  const productionActivity = (movements ?? []).filter((m) => m.direction === "OUT" && m.reason === "Production");

  const variants = [item.color, item.size].filter(Boolean).join(" · ");

  return (
    <Modal
      title={`${item.name}`}
      subtitle={item.reference}
      onClose={onClose}
      width={760}
      footer={<Button onClick={onClose}>Fermer</Button>}
    >
      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        <div className="detail-stack">
          <div className="detail-head">
            <div className="detail-photo">
              {item.photoUrl ? (
                <img className="detail-photo-img" src={item.photoUrl} alt={item.name} />
              ) : (
                <div className="detail-photo-none" aria-hidden="true">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="detail-head-info">
              <p className="detail-type">{item.inventoryType.label}</p>
              {item.description ? <p className="detail-desc">{item.description}</p> : null}
              {variants ? (
                <p className="detail-variants">
                  {item.color ? <span className="variant-chip">{item.color}</span> : null}
                  {item.size ? <span className="variant-chip">T. {item.size}</span> : null}
                  {item.gender ? <span className="variant-chip">{item.gender === "F" ? "Femme" : "Homme"}</span> : null}
                </p>
              ) : null}
              <div className="detail-pills">
                <StockPill status={item.stockStatus} low={item.low} />
                {item.archived ? <Pill tone="neutral">Archivé</Pill> : null}
                {hasBatches && nextBatch?.status === "expired" ? <Pill tone="danger">Lot périmé en stock</Pill> : null}
              </div>
              <dl className="detail-meta">
                {item.supplier ? (
                  <div>
                    <dt>Fournisseur</dt>
                    <dd>{item.supplier.name}</dd>
                  </div>
                ) : null}
                {item.inventoryType.hasPrice && item.price != null ? (
                  <div>
                    <dt>Prix (DZD)</dt>
                    <dd>{formatCurrency(item.price)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Réappro.</dt>
                  <dd>{formatQuantity(item.reorderThreshold, item.unit)}</dd>
                </div>
              </dl>
              {item.photoUrl ? (
                <p className="field-hint" style={{ marginTop: 4, marginBottom: 0 }}>
                  {item.photoUrl.startsWith("data:") ? "Photo intégrée" : item.photoUrl}
                </p>
              ) : null}
            </div>
          </div>

          <div className="detail-stats">
            <div className="stat-card">
              <span className="stat-card-label">En stock</span>
              <span className="stat-card-value">{formatQuantity(item.quantity, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Acheté</span>
              <span className="stat-card-value">{formatQuantity(item.purchased, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Utilisé</span>
              <span className="stat-card-value">{formatQuantity(item.used, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Seuil réappro.</span>
              <span className="stat-card-value">{formatQuantity(item.reorderThreshold, item.unit)}</span>
              <span className="stat-card-hint">
                {item.low ? "Stock sous le seuil — commander" : "Stock au-dessus du seuil"}
              </span>
            </div>
          </div>

          {item.inventoryType.hasMachineInfo && (
            <section className="detail-section">
              <h4 className="detail-section-title">Machine &amp; compatibilité</h4>
              <dl className="detail-facts">
                <div>
                  <dt>Machine</dt>
                  <dd>{item.machine ?? "—"}</dd>
                </div>
                <div>
                  <dt>Compatibilité</dt>
                  <dd>{item.compatibility ?? "—"}</dd>
                </div>
                <div>
                  <dt>Fabricant</dt>
                  <dd>{item.manufacturer ?? "—"}</dd>
                </div>
                <div>
                  <dt>Localisation</dt>
                  <dd>{item.location ?? "—"}</dd>
                </div>
                <div>
                  <dt>Criticité</dt>
                  <dd>{item.criticality ? <CriticalityPill value={item.criticality} /> : "—"}</dd>
                </div>
              </dl>
            </section>
          )}

          {item.inventoryType.hasQuality && item.qualityBreakdown ? (
            <section className="detail-section">
              <h4 className="detail-section-title">Classification de la production</h4>
              <div className="quality-grid">
                <QualityCard label="1er choix" value={formatNumber(item.qualityBreakdown["1er"])} tone="ok" hint="Conforme au standard de l'usine, vendable" />
                <QualityCard label="2ème choix" value={formatNumber(item.qualityBreakdown["2ème"])} tone="warn" hint="Sous le standard, vendable en qualité inférieure" />
                <QualityCard label="Unités rebutées" value={formatNumber(item.qualityBreakdown.rebut)} tone="neutral" hint="Invendables — comptées comme déchets" />
                <QualityCard
                  label="Inconnues / non justifiées"
                  value={formatNumber(item.unaccounted ?? 0)}
                  tone={item.unaccounted ? "danger" : "ok"}
                  hint={item.unaccounted ? "Unités en stock qu'aucun enregistrement de production n'explique" : "Toutes les unités sont justifiées"}
                />
              </div>
            </section>
          ) : null}

          {hasBatches && (
            <>
              <section className="detail-section">
                <h4 className="detail-section-title">Lots &amp; péremption</h4>
                {nextBatch ? (
                  <div className="recommended-lot">
                    <span className="recommended-lot-label">{nextLabel} à consommer</span>
                    <span className="recommended-lot-value">
                      {nextBatch.batchNumber} · {formatQuantity(nextBatch.remaining, item.unit)} restants
                    </span>
                    <ExpiryPill batch={nextBatch} />
                  </div>
                ) : (
                  <p className="field-hint" style={{ margin: 0 }}>
                    Aucun lot avec du stock restant.
                  </p>
                )}

                {batches === null ? (
                  <p className="loading-text">Chargement des lots…</p>
                ) : batches.length === 0 ? (
                  <p className="field-hint" style={{ margin: 0 }}>
                    Aucun lot enregistré pour cet article.
                  </p>
                ) : (
                  <div className="table-scroll">
                    <table className="stock-table detail-lots">
                      <thead>
                        <tr>
                          <th>N° lot</th>
                          <th>Fournisseur</th>
                          <th>Reçu le</th>
                          <th>Expire le</th>
                          <th>Restant</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => (
                          <tr key={batch.id} className={nextBatch?.id === batch.id ? "detail-recommended-row" : undefined}>
                            <td className="tabular">{batch.batchNumber}</td>
                            <td>{supplierByBatch.get(batch.id) ?? "—"}</td>
                            <td className="tabular">{formatDate(batch.receivedDate)}</td>
                            <td className="tabular">{batch.expiryDate ? formatDate(batch.expiryDate) : "—"}</td>
                            <td className="tabular">{formatQuantity(batch.remaining, item.unit)}</td>
                            <td>
                              <ExpiryPill batch={batch} />
                              {nextBatch?.id === batch.id ? <span className="field-hint"> · recommandé</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          <section className="detail-section">
            <h4 className="detail-section-title">Activité production liée</h4>
            <p className="field-hint" style={{ marginTop: 0 }}>
              Sorties enregistrées avec la raison « Production ».
            </p>
            {movements === null ? (
              <p className="loading-text">Chargement…</p>
            ) : productionActivity.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                Cet article n'a pas encore été utilisé en production.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Quantité</th>
                      <th>Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionActivity.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular">{formatDate(m.date)}</td>
                        <td className="tabular">−{formatQuantity(m.quantity, item.unit)}</td>
                        <td className="history-detail">
                          Production{m.batch ? <span className="history-batch"> · lot {m.batch.batchNumber}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="detail-section">
            <h4 className="detail-section-title">Historique des mouvements</h4>
            <p className="field-hint" style={{ marginTop: 0 }}>
              Entrées = achats (fournisseur) · Sorties = consommations (raison) · stock = entrées − sorties
            </p>
            {movements === null ? (
              <p className="loading-text">Chargement…</p>
            ) : movements.length === 0 ? (
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
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular">{formatDate(m.date)}</td>
                        <td>
                          <Pill tone={m.direction === "IN" ? "ok" : "neutral"}>
                            {m.direction === "IN" ? "Entrée" : "Sortie"}
                          </Pill>
                        </td>
                        <td className="tabular">
                          {m.direction === "IN" ? "+" : "−"}
                          {formatQuantity(m.quantity, item.unit)}
                        </td>
                        <td className="history-detail">
                          {m.direction === "IN" ? (m.supplier?.name ?? "—") : (m.reason ?? "—")}
                          {m.batch ? <span className="history-batch"> · lot {m.batch.batchNumber}</span> : null}
                          <QualityTag m={m} hasQuality={item.inventoryType.hasQuality} />
                          {m.direction === "OUT" ? <MaintenanceDetail m={m} /> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}