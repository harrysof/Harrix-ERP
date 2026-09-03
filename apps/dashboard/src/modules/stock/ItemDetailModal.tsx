import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Pill } from "../../components/ui/Pill";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import type { ApiBatch, ApiItem, ApiMovement } from "../../lib/stockApi";
import { fetchBatches, fetchMovements } from "../../lib/stockApi";
import { formatCurrency, formatDate, formatQuantity, formatNumber } from "../../lib/format";
import { ApiError } from "../../lib/api";
import { useI18n } from "../../state/LanguageContext";
import type { TranslationKey } from "../../lib/i18n";

function StockPill({ status, low }: { status: ApiItem["stockStatus"]; low: boolean }) {
  const { t } = useI18n();
  if (low) return <Pill tone="danger">{t("stock.state.lowLong")}</Pill>;
  if (status === "mid") return <Pill tone="warn">{t("stock.state.mid")}</Pill>;
  return <Pill tone="ok">{t("stock.state.good")}</Pill>;
}

function ExpiryPill({ batch }: { batch: ApiBatch }) {
  const { t } = useI18n();
  if (batch.status === "expired") return <Pill tone="danger">{t("stock.lot.expired")}</Pill>;
  if (batch.status === "warning")
    return <Pill tone="warn">{t("stock.lot.expiresOn", { date: formatDate(batch.expiryDate!) })}</Pill>;
  if (batch.status === "ok")
    return <span className="field-hint">{t("stock.lot.expiryShort", { date: formatDate(batch.expiryDate!) })}</span>;
  return <span className="field-hint">{t("stock.lot.noExpiry")}</span>;
}

/**
 * Criticality is stored as the French word the article was created with, so
 * the tone is keyed off that stored value while the label shown is translated.
 * An unrecognised value is displayed as typed rather than dropped.
 */
const CRITICALITY: Record<string, { tone: "danger" | "warn" | "ok"; key: TranslationKey }> = {
  Haute: { tone: "danger", key: "criticality.high" },
  Moyenne: { tone: "warn", key: "criticality.medium" },
  Basse: { tone: "ok", key: "criticality.low" },
};

function CriticalityPill({ value }: { value: string }) {
  const { t } = useI18n();
  const known = CRITICALITY[value];
  if (!known) return <Pill tone="neutral">{value}</Pill>;
  return <Pill tone={known.tone}>{t(known.key)}</Pill>;
}

function MaintenanceDetail({ m }: { m: ApiMovement }) {
  const { t } = useI18n();
  const bits = [m.machine, m.maintenanceRef && `${t("usage.maintenanceRef")} ${m.maintenanceRef}`, m.employee, m.notes].filter(
    Boolean,
  ) as string[];
  if (bits.length === 0) return null;
  return <div className="history-maintenance">{bits.join(" · ")}</div>;
}

/** The stored quality codes are the factory's own; only their labels translate. */
const QUALITY: Record<string, { tone: "ok" | "warn" | "neutral"; key: TranslationKey }> = {
  "1er": { tone: "ok", key: "quality.first" },
  "2ème": { tone: "warn", key: "quality.second" },
  rebut: { tone: "neutral", key: "quality.reject" },
};

function QualityTag({ m, hasQuality }: { m: ApiMovement; hasQuality: boolean }) {
  const { t } = useI18n();
  if (!hasQuality) return null;
  if (!m.quality) {
    return m.direction === "IN" ? <span className="history-batch"> {t("item.uncategorisedIn")}</span> : null;
  }
  const known = QUALITY[m.quality];
  return (
    <>
      {" "}
      <Pill tone={known?.tone ?? "danger"}>{known ? t(known.key) : m.quality}</Pill>
    </>
  );
}

/**
 * Where one entry came from, in words: the document if there is one, the kind
 * of movement otherwise. This is the answer to "why is this in my stock?" and
 * it sits on the same line as what that entry cost.
 */
function OriginTag({ m }: { m: ApiMovement }) {
  const { t } = useI18n();
  const key = SOURCE_LABELS[m.sourceType ?? ""] ?? null;
  if (!key && !m.sourceRef) return null;
  return (
    <span className="history-origin">
      {key ? t(key) : null}
      {m.sourceRef ? <span className="history-batch"> · {m.sourceRef}</span> : null}
    </span>
  );
}

/** Mirrors MOVEMENT_SOURCE_LABELS in the backend's stock-math.ts. */
const SOURCE_LABELS: Record<string, TranslationKey> = {
  MANUAL: "source.manual",
  SUPPLIER_ORDER: "source.supplierOrder",
  PURCHASE: "source.purchase",
  PRODUCTION: "source.production",
  SALE: "source.sale",
};

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
  const { t } = useI18n();
  const [batches, setBatches] = useState<ApiBatch[] | null>(null);
  const [movements, setMovements] = useState<ApiMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasBatches = item.inventoryType.hasBatches;
  const nextLabel = t(item.inventoryType.hasExpiry ? "stock.lot.nextFefo" : "stock.lot.nextFifo");

  useEffect(() => {
    Promise.all([fetchBatches(item.id), fetchMovements(item.id)])
      .then(([b, m]) => {
        setBatches(b);
        setMovements(m);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("error.loadDetail")));
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

  // Finished goods are made, not bought: their unit cost is what the
  // production batches behind them consumed in raw materials, which is a much
  // narrower claim than "what this article costs" — so it is labelled, and
  // warned about, differently everywhere it appears.
  const isProduced = item.inventoryType.key === "finished-goods";
  const costLabel = t(isProduced ? "item.materialCostPerUnit" : "item.averageUnitCost");

  return (
    <Modal
      title={`${item.name}`}
      subtitle={item.reference}
      onClose={onClose}
      width={760}
      footer={<Button onClick={onClose}>{t("action.close")}</Button>}
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
                  {item.size ? <span className="variant-chip">{t("stock.col.size")} {item.size}</span> : null}
                  {item.gender ? <span className="variant-chip">{t(item.gender === "F" ? "item.genderF" : "item.genderM")}</span> : null}
                </p>
              ) : null}
              <div className="detail-pills">
                <StockPill status={item.stockStatus} low={item.low} />
                {item.archived ? <Pill tone="neutral">{t("state.archived")}</Pill> : null}
                {hasBatches && nextBatch?.status === "expired" ? <Pill tone="danger">{t("stock.lot.expiredInStock")}</Pill> : null}
              </div>
              <dl className="detail-meta">
                {item.supplier ? (
                  <div>
                    <dt>{t("field.supplier")}</dt>
                    <dd>{item.supplier.name}</dd>
                  </div>
                ) : null}
                {item.inventoryType.hasPrice && item.price != null ? (
                  <div>
                    <dt>{t("field.salePrice")}</dt>
                    <dd>{formatCurrency(item.price)}</dd>
                  </div>
                ) : null}
                {item.unitCost != null ? (
                  <div>
                    <dt>{t("item.standardCost")}</dt>
                    <dd>{formatCurrency(item.unitCost)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t("item.reorderShort")}</dt>
                  <dd>{formatQuantity(item.reorderThreshold, item.unit)}</dd>
                </div>
              </dl>
              {item.photoUrl ? (
                <p className="field-hint" style={{ marginTop: 4, marginBottom: 0 }}>
                  {item.photoUrl.startsWith("data:") ? t("item.embeddedPhoto") : item.photoUrl}
                </p>
              ) : null}
            </div>
          </div>

          <div className="detail-stats">
            <div className="stat-card">
              <span className="stat-card-label">{t("item.inStock")}</span>
              <span className="stat-card-value">{formatQuantity(item.quantity, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">{t("stock.col.purchased")}</span>
              <span className="stat-card-value">{formatQuantity(item.purchased, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">{t("stock.col.used")}</span>
              <span className="stat-card-value">{formatQuantity(item.used, item.unit)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">{costLabel}</span>
              <span className="stat-card-value">
                {item.averageUnitCost !== null ? formatCurrency(item.averageUnitCost) : "—"}
              </span>
              <span className="stat-card-hint">
                {item.averageUnitCost === null
                  ? t("stock.noValuedEntry")
                  : isProduced
                    ? t("item.producedCostHint")
                    : t("stock.weightedAverageShort")}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">{t("item.stockValue")}</span>
              <span className="stat-card-value">{item.stockValue !== null ? formatCurrency(item.stockValue) : "—"}</span>
              <span className="stat-card-hint">
                {item.uncostedQuantity > 0
                  ? t("stock.unpriced", { quantity: formatQuantity(item.uncostedQuantity, item.unit) })
                  : t("stock.remainingTimesCost")}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">{t("item.reorderThreshold")}</span>
              <span className="stat-card-value">{formatQuantity(item.reorderThreshold, item.unit)}</span>
              <span className="stat-card-hint">
                {item.low ? t("stock.belowThreshold") : t("stock.aboveThreshold")}
              </span>
            </div>
          </div>

          <section className="detail-section">
            <h4 className="detail-section-title">{t("item.valueSection")}</h4>
            <p className="field-hint" style={{ marginTop: 0 }}>
              {t("item.valueIntro")}
            </p>

            {isProduced ? (
              <Banner tone="warn">
                {t("item.producedCostWarning")}
              </Banner>
            ) : null}

            {item.costSources.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                {t("item.noValuedEntries")}
              </p>
            ) : (
              <div className="table-scroll">
                <table className="stock-table detail-lots">
                  <thead>
                    <tr>
                      <th>{t("item.col.origin")}</th>
                      <th>{t("item.col.documents")}</th>
                      <th>{t("item.col.quantityIn")}</th>
                      <th>{t("field.unitCost")}</th>
                      <th>{t("field.value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.costSources.map((source) => (
                      <tr key={source.source}>
                        <td>{source.label}</td>
                        <td>
                          {source.references.length > 0 ? (
                            <span className="cell-truncate" title={source.references.join(", ")}>
                              {source.references.join(", ")}
                            </span>
                          ) : (
                            <span className="field-hint">—</span>
                          )}
                        </td>
                        <td className="tabular">
                          {formatQuantity(source.quantity, item.unit)}
                          {source.uncostedQuantity > 0 ? (
                            <span className="field-hint">
                              {" "}
                              {t("item.ofWhichUnpriced", { quantity: formatNumber(source.uncostedQuantity) })}
                            </span>
                          ) : null}
                        </td>
                        <td className="tabular">
                          {source.averageUnitCost !== null ? formatCurrency(source.averageUnitCost) : <span className="field-hint">—</span>}
                        </td>
                        <td className="tabular">{formatCurrency(source.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>{t("item.totalIn")}</td>
                      <td className="tabular">{formatCurrency(item.purchasedValue)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}>{t("item.remainingValue")}</td>
                      <td className="tabular">{item.stockValue !== null ? formatCurrency(item.stockValue) : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {item.inventoryType.hasMachineInfo && (
            <section className="detail-section">
              <h4 className="detail-section-title">{t("item.machineSection")}</h4>
              <dl className="detail-facts">
                <div>
                  <dt>{t("field.machine")}</dt>
                  <dd>{item.machine ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("stock.col.compatibility")}</dt>
                  <dd>{item.compatibility ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("stock.col.manufacturer")}</dt>
                  <dd>{item.manufacturer ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("stock.col.location")}</dt>
                  <dd>{item.location ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("stock.col.criticality")}</dt>
                  <dd>{item.criticality ? <CriticalityPill value={item.criticality} /> : "—"}</dd>
                </div>
              </dl>
            </section>
          )}

          {item.inventoryType.hasQuality && item.qualityBreakdown ? (
            <section className="detail-section">
              <h4 className="detail-section-title">{t("item.qualitySection")}</h4>
              <div className="quality-grid">
                <QualityCard
                  label={t("quality.first")}
                  value={formatNumber(item.qualityBreakdown["1er"])}
                  tone="ok"
                  hint={t("quality.firstHint")}
                />
                <QualityCard
                  label={t("quality.second")}
                  value={formatNumber(item.qualityBreakdown["2ème"])}
                  tone="warn"
                  hint={t("quality.secondHint")}
                />
                <QualityCard
                  label={t("quality.rejectedUnits")}
                  value={formatNumber(item.qualityBreakdown.rebut)}
                  tone="neutral"
                  hint={t("quality.rejectHint")}
                />
                <QualityCard
                  label={t("quality.unaccounted")}
                  value={formatNumber(item.unaccounted ?? 0)}
                  tone={item.unaccounted ? "danger" : "ok"}
                  hint={t(item.unaccounted ? "quality.unaccountedHint" : "quality.allAccounted")}
                />
              </div>
            </section>
          ) : null}

          {hasBatches && (
            <>
              <section className="detail-section">
                <h4 className="detail-section-title">{t("item.lotsSection")}</h4>
                {nextBatch ? (
                  <div className="recommended-lot">
                    <span className="recommended-lot-label">{t("stock.lot.nextToUse", { label: nextLabel })}</span>
                    <span className="recommended-lot-value">
                      {t("stock.lot.remainingUnits", {
                        batch: nextBatch.batchNumber,
                        quantity: formatQuantity(nextBatch.remaining, item.unit),
                      })}
                    </span>
                    <ExpiryPill batch={nextBatch} />
                  </div>
                ) : (
                  <p className="field-hint" style={{ margin: 0 }}>
                    {t("item.noLotsWithStock")}
                  </p>
                )}

                {batches === null ? (
                  <p className="loading-text">{t("item.loadingLots")}</p>
                ) : batches.length === 0 ? (
                  <p className="field-hint" style={{ margin: 0 }}>
                    {t("item.noLots")}
                  </p>
                ) : (
                  <div className="table-scroll">
                    <table className="stock-table detail-lots">
                      <thead>
                        <tr>
                          <th>{t("field.batchNumber")}</th>
                          <th>{t("field.supplier")}</th>
                          <th>{t("item.receivedOn")}</th>
                          <th>{t("item.expiresOnCol")}</th>
                          <th>{t("stock.col.remaining")}</th>
                          <th>{t("field.unitCost")}</th>
                          <th>{t("field.value")}</th>
                          <th>{t("field.status")}</th>
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
                            <td className="tabular">
                              {batch.unitCost != null ? formatCurrency(batch.unitCost) : <span className="field-hint">—</span>}
                            </td>
                            <td className="tabular">
                              {batch.unitCost != null ? (
                                formatCurrency(batch.unitCost * batch.remaining)
                              ) : (
                                <span className="field-hint">—</span>
                              )}
                            </td>
                            <td>
                              <ExpiryPill batch={batch} />
                              {nextBatch?.id === batch.id ? <span className="field-hint"> · {t("stock.lot.recommended")}</span> : null}
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
            <h4 className="detail-section-title">{t("item.productionSection")}</h4>
            <p className="field-hint" style={{ marginTop: 0 }}>
              {t("item.productionIntro")}
            </p>
            {movements === null ? (
              <p className="loading-text">{t("state.loading")}</p>
            ) : productionActivity.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                {t("item.notUsedInProduction")}
              </p>
            ) : (
              <div className="table-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>{t("field.date")}</th>
                      <th>{t("field.quantity")}</th>
                      <th>{t("item.consumedValue")}</th>
                      <th>{t("field.detail")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionActivity.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular">{formatDate(m.date)}</td>
                        <td className="tabular">−{formatQuantity(m.quantity, item.unit)}</td>
                        <td className="tabular">
                          {m.unitCost != null ? formatCurrency(m.unitCost * m.quantity) : <span className="field-hint">—</span>}
                        </td>
                        <td className="history-detail">
                          {t("source.production")}
                          {m.batch ? (
                            <span className="history-batch">
                              {" "}
                              · {t("field.batch")} {m.batch.batchNumber}
                            </span>
                          ) : null}
                          <OriginTag m={m} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="detail-section">
            <h4 className="detail-section-title">{t("item.movementsSection")}</h4>
            <p className="field-hint" style={{ marginTop: 0 }}>
              {t("item.movementsIntro")}
            </p>
            {movements === null ? (
              <p className="loading-text">{t("state.loading")}</p>
            ) : movements.length === 0 ? (
              <p className="field-hint" style={{ margin: 0 }}>
                {t("item.noMovements")}
              </p>
            ) : (
              <div className="table-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>{t("field.date")}</th>
                      <th>{t("item.col.movement")}</th>
                      <th>{t("field.quantity")}</th>
                      <th>{t("item.col.unitCostShort")}</th>
                      <th>{t("field.value")}</th>
                      <th>{t("field.detail")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular">{formatDate(m.date)}</td>
                        <td>
                          <Pill tone={m.direction === "IN" ? "ok" : "neutral"}>
                            {t(m.direction === "IN" ? "item.movementIn" : "item.movementOut")}
                          </Pill>
                        </td>
                        <td className="tabular">
                          {m.direction === "IN" ? "+" : "−"}
                          {formatQuantity(m.quantity, item.unit)}
                        </td>
                        <td className="tabular">
                          {m.unitCost != null ? formatCurrency(m.unitCost) : <span className="field-hint">—</span>}
                        </td>
                        <td className="tabular">
                          {m.unitCost != null ? formatCurrency(m.unitCost * m.quantity) : <span className="field-hint">—</span>}
                        </td>
                        <td className="history-detail">
                          {m.direction === "IN" ? (m.supplier?.name ?? "—") : (m.reason ?? "—")}
                          {m.batch ? (
                            <span className="history-batch">
                              {" "}
                              · {t("field.batch")} {m.batch.batchNumber}
                            </span>
                          ) : null}
                          <QualityTag m={m} hasQuality={item.inventoryType.hasQuality} />
                          <OriginTag m={m} />
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