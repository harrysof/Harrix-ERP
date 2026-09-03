import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { FilePicker } from "../../components/ui/FilePicker";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate, formatQuantity } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  deletePurchaseOrder,
  PO_PAYMENT_LABELS,
  PO_PAYMENT_TONES,
  PO_STATUS_LABELS,
  PO_STATUS_TONES,
  receivePurchaseOrder,
  recordPurchasePayment,
  setPurchaseOrderStatus,
  updatePurchaseOrder,
  type ApiPurchaseOrder,
  type PoStatus,
  type ReceiptLineInput,
} from "../../lib/purchasingApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { TotalsPanel } from "./PurchaseOrderModal";

interface DetailProps {
  order: ApiPurchaseOrder;
  onClose: () => void;
  onChanged: () => void;
  /** Opens the edit form. Only offered while the order is still a brouillon. */
  onEdit?: () => void;
}

/** What each status can move to by hand. Received/partial are never settable. */
const NEXT_STATUSES: Partial<Record<PoStatus, PoStatus[]>> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  PARTIALLY_RECEIVED: [],
  RECEIVED: [],
  CANCELLED: [],
};

/**
 * §14's purchase-order detail: what was ordered, what has arrived, and the
 * receiving form. Receiving is the only action here that touches stock.
 */
export function PurchaseOrderDetailModal({ order, onClose, onChanged, onEdit }: DetailProps) {
  const { can } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const [receiptDate, setReceiptDate] = useState(todayIso());
  const [deliveryNote, setDeliveryNote] = useState("");
  const [allowOver, setAllowOver] = useState(false);
  const [draft, setDraft] = useState<Record<string, { quantity: string; batchNumber: string; expiryDate: string }>>({});

  const [paying, setPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());

  const [attachmentDirty, setAttachmentDirty] = useState(false);
  const [invoiceFileName, setInvoiceFileName] = useState(order.invoiceFileName ?? "");
  const [invoiceFileUrl, setInvoiceFileUrl] = useState(order.invoiceFileUrl ?? "");

  const canReceive = order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED";
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.action"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function lineDraft(lineId: string) {
    return draft[lineId] ?? { quantity: "", batchNumber: "", expiryDate: "" };
  }

  async function submitReceipt() {
    const lines: ReceiptLineInput[] = order.lines
      .filter((l) => Number(lineDraft(l.id).quantity) > 0)
      .map((l) => {
        const d = lineDraft(l.id);
        return {
          purchaseOrderLineId: l.id,
          quantity: Number(d.quantity),
          ...(d.batchNumber.trim() ? { batchNumber: d.batchNumber.trim() } : {}),
          ...(d.expiryDate ? { expiryDate: d.expiryDate } : {}),
        };
      });

    if (lines.length === 0) {
      setError(t("po.err.receiptLines"));
      return;
    }

    const ok = await run(() =>
      receivePurchaseOrder(order.id, {
        date: receiptDate,
        lines,
        ...(deliveryNote.trim() ? { deliveryNote: deliveryNote.trim() } : {}),
        ...(allowOver ? { allowOverDelivery: true } : {}),
      }),
    );
    if (ok) {
      setReceiving(false);
      setDraft({});
      setDeliveryNote("");
      setAllowOver(false);
    }
  }

  async function submitPayment() {
    const amount = Number(paymentAmount);
    if (!(amount > 0)) {
      setError(t("po.err.paymentAmount"));
      return;
    }
    const ok = await run(() => recordPurchasePayment(order.id, { amount, date: paymentDate }));
    if (ok) {
      setPaying(false);
      setPaymentAmount("");
    }
  }

  async function saveAttachment() {
    const ok = await run(() => updatePurchaseOrder(order.id, { invoiceFileName, invoiceFileUrl }));
    if (ok) setAttachmentDirty(false);
  }

  return (
    <Modal
      title={t("po.modalTitle", { code: order.code })}
      onClose={onClose}
      width={900}
      footer={
        <>
          <Button onClick={onClose}>{t("action.close")}</Button>
          <Button onClick={() => window.print()}>{t("action.print")}</Button>
          {order.status === "DRAFT" && can("purchasing:write") && onEdit ? (
            <Button onClick={onEdit}>{t("action.edit")}</Button>
          ) : null}
          {order.status === "DRAFT" && can("purchasing:write") ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("po.confirmDeleteDraft", { code: order.code }))) {
                  run(() => deletePurchaseOrder(order.id)).then((ok) => ok && onClose());
                }
              }}
            >
              {t("action.delete")}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="form-stack">
        <div className="batch-meta">
          <Meta
            label={t("field.status")}
            value={<Pill tone={PO_STATUS_TONES[order.status]}>{t(PO_STATUS_LABELS[order.status])}</Pill>}
          />
          <Meta
            label={t("field.payment")}
            value={<Pill tone={PO_PAYMENT_TONES[order.paymentStatus]}>{t(PO_PAYMENT_LABELS[order.paymentStatus])}</Pill>}
          />
          <Meta label={t("field.supplier")} value={order.supplier.name} />
          <Meta label={t("field.date")} value={formatDate(order.date)} />
          <Meta label={t("po.col.expected")} value={order.expectedDate ? formatDate(order.expectedDate) : "—"} />
        </div>

        {order.supplier.contactName || order.supplier.phone ? (
          <p className="batch-notes">
            {t("po.contactLine", { name: order.supplier.contactName ?? "—" })}
            {order.supplier.phone ? ` · ${order.supplier.phone}` : ""}
            {order.supplier.email ? ` · ${order.supplier.email}` : ""}
          </p>
        ) : null}

        {order.notes ? <p className="batch-notes">{order.notes}</p> : null}

        <section>
          <h4 className="section-title">{t("po.orderedItems")}</h4>
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t("field.item")}</th>
                  <th className="num">{t("po.col.orderedQty")}</th>
                  <th className="num">{t("po.col.receivedQty")}</th>
                  <th className="num">{t("po.col.remainingQty")}</th>
                  <th className="num">{t("field.unitPrice")}</th>
                  <th className="num">{t("po.col.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className={line.outstanding > 0 && order.status !== "CANCELLED" ? "row-attention" : undefined}>
                    <td>
                      {line.item.name}
                      <span className="muted"> · {line.item.reference}</span>
                    </td>
                    <td className="tabular num">{formatQuantity(line.quantity, line.item.unit)}</td>
                    <td className="tabular num">{line.received}</td>
                    <td className="tabular num">{line.outstanding}</td>
                    <td className="tabular num">{formatCurrency(line.unitCost)}</td>
                    <td className="tabular num">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TotalsPanel totals={order.totals} />
        </section>

        <section>
          <h4 className="section-title">{t("po.attachment")}</h4>
          {can("purchasing:write") ? (
            <>
              <FilePicker
                fileName={invoiceFileName || null}
                fileUrl={invoiceFileUrl || null}
                onSelect={(name, url) => {
                  setInvoiceFileName(name);
                  setInvoiceFileUrl(url);
                  setAttachmentDirty(true);
                }}
                onClear={() => {
                  setInvoiceFileName("");
                  setInvoiceFileUrl("");
                  setAttachmentDirty(true);
                }}
              />
              {attachmentDirty ? (
                <Button variant="primary" style={{ marginTop: 10 }} disabled={busy} onClick={saveAttachment}>
                  {busy ? t("action.saving") : t("action.save")}
                </Button>
              ) : null}
            </>
          ) : order.invoiceFileName && order.invoiceFileUrl ? (
            <a href={order.invoiceFileUrl} download={order.invoiceFileName} target="_blank" rel="noreferrer">
              {order.invoiceFileName}
            </a>
          ) : (
            <p className="muted">{t("po.noAttachment")}</p>
          )}
        </section>

        {nextStatuses.length > 0 && can("purchasing:approve") ? (
          <section>
            <h4 className="section-title">{t("po.changeStatus")}</h4>
            <div className="row-actions">
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  variant={status === "CANCELLED" ? "danger" : "secondary"}
                  disabled={busy}
                  onClick={() => run(() => setPurchaseOrderStatus(order.id, status))}
                >
                  {t(PO_STATUS_LABELS[status])}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        {can("purchasing:write") ? (
          <section>
            <h4 className="section-title">{t("field.payment")}</h4>
            <div className="invoice-block">
              <p>
                {t("po.paidOf", {
                  paid: formatCurrency(order.amountPaid),
                  total: formatCurrency(order.totals.total),
                })}
                {order.balanceDue > 0 ? t("po.balanceDue", { balance: formatCurrency(order.balanceDue) }) : null}
              </p>
            </div>

            {order.paymentStatus !== "CANCELLED" && order.balanceDue > 0 ? (
              paying ? (
                <div className="form-stack" style={{ marginTop: 10 }}>
                  <div className="form-row">
                    <Field
                      label={t("po.amountPaidLabel")}
                      hint={t("po.balanceHint", { balance: formatCurrency(order.balanceDue) })}
                    >
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={order.balanceDue}
                        step="any"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </Field>
                    <Field label={t("po.paymentDate")}>
                      <input className="input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </Field>
                  </div>
                  <div className="row-actions">
                    <Button variant="primary" disabled={busy} onClick={submitPayment}>
                      {busy ? t("action.saving") : t("po.savePayment")}
                    </Button>
                    <Button onClick={() => setPaying(false)}>{t("action.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setPaying(true)}>
                  {t("po.addPayment")}
                </Button>
              )
            ) : null}
          </section>
        ) : null}

        <section>
          <h4 className="section-title">{t("po.receipts")}</h4>

          {order.receipts.length === 0 ? (
            <p className="muted">{t("po.noReceipts")}</p>
          ) : (
            <div className="table-scroll">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>{t("field.number")}</th>
                    <th>{t("field.date")}</th>
                    <th>{t("po.deliveryNote")}</th>
                    <th className="num">{t("po.col.lines")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td>{receipt.code}</td>
                      <td className="tabular">{formatDate(receipt.date)}</td>
                      <td>{receipt.deliveryNote ?? <span className="muted">—</span>}</td>
                      <td className="tabular num">{receipt.lines.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canReceive && can("purchasing:write") ? (
            receiving ? (
              <div className="form-stack" style={{ marginTop: 14 }}>
                <div className="form-row">
                  <Field label={t("po.receiptDate")}>
                    <input className="input" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
                  </Field>
                  <Field label={t("po.deliveryNote")} hint={t("po.deliveryNoteHint")}>
                    <input className="input" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} />
                  </Field>
                </div>

                {order.lines
                  .filter((l) => l.outstanding > 0 || allowOver)
                  .map((line) => {
                    const d = lineDraft(line.id);
                    const needsBatch = line.item.inventoryType.hasBatches;
                    const needsExpiry = line.item.inventoryType.hasExpiry;
                    return (
                      <div key={line.id} className="receive-line">
                        <div className="receive-line-head">
                          <strong>{line.item.name}</strong>
                          <span className="muted">
                            {t("po.remainingQty", { quantity: line.outstanding, unit: line.item.unit })}
                          </span>
                        </div>
                        <div className="form-row">
                          <Field label={t("po.receivedQtyLabel", { unit: line.item.unit })}>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              step="any"
                              value={d.quantity}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, quantity: e.target.value } }))}
                            />
                          </Field>
                          {needsBatch ? (
                            <Field label={t("field.batchNumber")} hint={t("po.requiredForProduct")}>
                              <input
                                className="input"
                                value={d.batchNumber}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, batchNumber: e.target.value } }))}
                              />
                            </Field>
                          ) : null}
                          {needsExpiry ? (
                            <Field label={t("inv.opt.expiry")} hint={t("po.requiredForProduct")}>
                              <input
                                className="input"
                                type="date"
                                value={d.expiryDate}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [line.id]: { ...d, expiryDate: e.target.value } }))}
                              />
                            </Field>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                <label className="checkbox-row">
                  <input type="checkbox" checked={allowOver} onChange={(e) => setAllowOver(e.target.checked)} />
                  <span>
                    {t("po.acceptOverDelivery")}
                    <span className="checkbox-hint">{t("po.overDeliveryHint")}</span>
                  </span>
                </label>

                <Banner tone="info">{t("po.receiptIncreasesStock")}</Banner>

                <div className="row-actions">
                  <Button variant="primary" onClick={submitReceipt} disabled={busy}>
                    {busy ? t("action.saving") : t("po.saveReceipt")}
                  </Button>
                  <Button onClick={() => setReceiving(false)}>{t("action.cancel")}</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setReceiving(true)}>
                {t("po.addReceipt")}
              </Button>
            )
          ) : order.status === "DRAFT" || order.status === "SUBMITTED" ? (
            <Banner tone="info">{t("po.mustApprove")}</Banner>
          ) : null}
        </section>

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="batch-meta-item">
      <span className="batch-meta-label">{label}</span>
      <span className="batch-meta-value">{value}</span>
    </div>
  );
}
