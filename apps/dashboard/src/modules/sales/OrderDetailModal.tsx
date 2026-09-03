import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { todayIso } from "../../lib/date";
import {
  deleteOrder,
  recordPayment,
  returnOrder,
  setOrderArchived,
  setOrderStatus,
  shipOrder,
  PAYMENT_LABELS,
  PAYMENT_TONES,
  SHIPMENT_LABELS,
  SHIPMENT_TONES,
  type ApiOrder,
  type ReturnOrderLineInput,
} from "../../lib/salesApi";
import { useAuth } from "../../state/AuthContext";
import { useI18n } from "../../state/LanguageContext";
import { OrderTotalsPanel } from "./OrderTotalsPanel";

interface OrderDetailModalProps {
  order: ApiOrder;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}

/**
 * §17: the invoice-style order view — items, totals, customer info, shipping
 * info, statuses, and the actions the order's own state actually permits.
 *
 * Which actions appear comes from the backend's canEdit/canShip/canCancel
 * flags rather than from rules re-implemented here, so a button never offers
 * something the server will refuse.
 */
export function OrderDetailModal({ order, onClose, onChanged, onEdit }: OrderDetailModalProps) {
  const { can } = useAuth();
  const { t, tn } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [shipDate, setShipDate] = useState(todayIso());
  const [markPaid, setMarkPaid] = useState(false);

  const [paying, setPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());

  const [returning, setReturning] = useState(false);
  const [returnDate, setReturnDate] = useState(todayIso());
  const [returnReason, setReturnReason] = useState("");
  const [returnDraft, setReturnDraft] = useState<Record<string, string>>({});

  const writable = can("orders:write");

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

  async function submitReturn() {
    const lines: ReturnOrderLineInput[] = order.lines
      .filter((l) => Number(returnDraft[l.id]) > 0)
      .map((l) => ({ orderLineId: l.id, quantity: Number(returnDraft[l.id]) }));

    if (lines.length === 0) {
      setError(t("order.err.returnLines"));
      return;
    }

    const ok = await run(() =>
      returnOrder(order.id, { date: returnDate, lines, ...(returnReason.trim() ? { reason: returnReason.trim() } : {}) }),
    );
    if (ok) {
      setReturning(false);
      setReturnDraft({});
      setReturnReason("");
    }
  }

  async function submitPayment() {
    const amount = Number(paymentAmount);
    if (!(amount > 0)) {
      setError(t("order.err.paymentAmount"));
      return;
    }
    const ok = await run(() => recordPayment(order.id, { amount, date: paymentDate }));
    if (ok) {
      setPaying(false);
      setPaymentAmount("");
    }
  }

  return (
    <Modal
      title={t("order.modalTitle", { code: order.code })}
      onClose={onClose}
      width={900}
      footer={
        <>
          <Button onClick={onClose}>{t("action.close")}</Button>
          <Button onClick={() => window.print()}>{t("action.print")}</Button>
          {writable && order.canEdit ? <Button onClick={onEdit}>{t("action.edit")}</Button> : null}
          {writable ? (
            <Button variant="ghost" disabled={busy} onClick={() => run(() => setOrderArchived(order.id, !order.archived))}>
              {t(order.archived ? "action.unarchive" : "action.archive")}
            </Button>
          ) : null}
          {writable && order.canCancel ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("order.confirmCancelShort", { code: order.code }))) {
                  run(() => setOrderStatus(order.id, { shipmentStatus: "CANCELLED", paymentStatus: "CANCELLED" }));
                }
              }}
            >
              {t("order.cancel")}
            </Button>
          ) : null}
          {writable && order.shipmentStatus !== "SHIPPED" ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("order.confirmDelete", { code: order.code }))) {
                  run(() => deleteOrder(order.id)).then((ok) => ok && onClose());
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
        <div className="invoice-head">
          <div>
            <p className="invoice-label">{t("order.label")}</p>
            <p className="invoice-code">{order.code}</p>
            <p className="muted">{formatDate(order.date)}</p>
          </div>
          <div className="invoice-status">
            <Pill tone={SHIPMENT_TONES[order.shipmentStatus]}>
              {t("order.shipmentPill", { status: t(SHIPMENT_LABELS[order.shipmentStatus]) })}
            </Pill>
            <Pill tone={PAYMENT_TONES[order.paymentStatus]}>
              {t("order.paymentPill", { status: t(PAYMENT_LABELS[order.paymentStatus]) })}
            </Pill>
            {order.archived ? <Pill tone="neutral">{t("order.archived")}</Pill> : null}
          </div>
        </div>

        {order.stockWarnings.length > 0 ? (
          <Banner tone="warn">
            {t("order.stockShortBanner", {
              details: order.stockWarnings
                .map((w) =>
                  t("order.stockShortDetail", {
                    item: w.itemName,
                    available: w.available,
                    unit: w.unit,
                    required: w.required,
                  }),
                )
                .join(" · "),
            })}
          </Banner>
        ) : null}

        <section>
          <h4 className="section-title">{t("order.items")}</h4>
          <div className="table-scroll">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t("order.product")}</th>
                  <th>{t("field.reference")}</th>
                  <th className="num">{t("field.quantity")}</th>
                  <th className="num">{t("field.unitPrice")}</th>
                  <th className="num">{t("order.lineDiscount")}</th>
                  <th className="num">{t("order.col.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.item.name}</td>
                    <td className="tabular">{line.item.reference}</td>
                    <td className="tabular num">
                      {line.quantity} {line.item.unit}
                    </td>
                    <td className="tabular num">{formatCurrency(line.unitPrice)}</td>
                    <td className="tabular num">{line.discount ? formatCurrency(line.discount) : <span className="muted">—</span>}</td>
                    <td className="tabular num">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OrderTotalsPanel totals={order.totals} />
        </section>

        <div className="invoice-columns">
          <section>
            <h4 className="section-title">{t("field.customer")}</h4>
            <div className="invoice-block">
              <p className="invoice-block-strong">{order.customer.fullName}</p>
              <p>{order.customer.email ?? <span className="muted">{t("order.noEmail")}</span>}</p>
              <p>{order.customer.phone ?? <span className="muted">{t("order.noPhone")}</span>}</p>
            </div>
          </section>

          <section>
            <h4 className="section-title">{t("order.delivery")}</h4>
            <div className="invoice-block">
              <p className="invoice-block-strong">{order.shipToName ?? order.customer.fullName}</p>
              <p>{order.shipToAddress ?? <span className="muted">{t("order.noAddress")}</span>}</p>
              <p>
                {[order.shipToPostalCode, order.shipToCity].filter(Boolean).join(" ") || <span className="muted">—</span>}
              </p>
              <p>{[order.shipToProvince, order.shipToCountry].filter(Boolean).join(", ") || <span className="muted">—</span>}</p>
              {order.shipToPhone ? <p>{order.shipToPhone}</p> : null}
              {order.shippedAt ? <p className="muted">{t("order.shippedOn", { date: formatDate(order.shippedAt) })}</p> : null}
            </div>
          </section>
        </div>

        {order.notes ? <p className="batch-notes">{order.notes}</p> : null}

        {writable ? (
          <section>
            <h4 className="section-title">{t("order.statusSection")}</h4>

            {order.canShip ? (
              shipping ? (
                <div className="form-stack">
                  <div className="form-row">
                    <Field label={t("order.shipDate")}>
                      <input className="input" type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} />
                    </Field>
                  </div>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                    <span>{t("order.alsoMarkPaid")}</span>
                  </label>
                  <Banner tone="warn">
                    {t("order.shipWarning", {
                      count: tn("order.unitCount", order.lines.reduce((s, l) => s + l.quantity, 0)),
                    })}
                  </Banner>
                  <div className="row-actions">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => run(() => shipOrder(order.id, { date: shipDate, markPaid })).then((ok) => ok && setShipping(false))}
                    >
                      {busy ? t("order.shipping") : t("order.confirmShipButton")}
                    </Button>
                    <Button onClick={() => setShipping(false)}>{t("action.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" onClick={() => setShipping(true)}>
                  {t("order.shipButton")}
                </Button>
              )
            ) : null}

            <div className="invoice-block" style={{ marginTop: 12 }}>
              <p>
                {t("order.paidOf", {
                  paid: formatCurrency(order.amountPaid),
                  total: formatCurrency(order.totals.total),
                })}
                {order.balanceDue > 0 ? t("order.balanceDue", { balance: formatCurrency(order.balanceDue) }) : null}
              </p>
            </div>

            {order.paymentStatus !== "CANCELLED" && order.balanceDue > 0 ? (
              paying ? (
                <div className="form-stack" style={{ marginTop: 10 }}>
                  <div className="form-row">
                    <Field
                      label={t("order.amountPaidLabel")}
                      hint={t("order.balanceHint", { balance: formatCurrency(order.balanceDue) })}
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
                    <Field label={t("order.paymentDate")}>
                      <input className="input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                    </Field>
                  </div>
                  <div className="row-actions">
                    <Button variant="primary" disabled={busy} onClick={submitPayment}>
                      {busy ? t("action.saving") : t("order.savePayment")}
                    </Button>
                    <Button onClick={() => setPaying(false)}>{t("action.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setPaying(true)}>
                  {t("order.addPayment")}
                </Button>
              )
            ) : null}
          </section>
        ) : null}

        {order.shipmentStatus === "SHIPPED" || order.returns.length > 0 ? (
          <section>
            <h4 className="section-title">{t("order.returnsSection")}</h4>

            {order.returns.length === 0 ? (
              <p className="muted">{t("order.noReturnsRecorded")}</p>
            ) : (
              <div className="table-scroll">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t("field.number")}</th>
                      <th>{t("field.date")}</th>
                      <th>{t("order.col.motive")}</th>
                      <th className="num">{t("field.quantity")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.returns.map((ret) => (
                      <tr key={ret.id}>
                        <td>{ret.code}</td>
                        <td className="tabular">{formatDate(ret.date)}</td>
                        <td>{ret.reason ?? <span className="muted">—</span>}</td>
                        <td className="tabular num">{ret.lines.reduce((s, l) => s + l.quantity, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {writable && order.canReturn ? (
              returning ? (
                <div className="form-stack" style={{ marginTop: 14 }}>
                  <div className="form-row">
                    <Field label={t("order.returnDate")}>
                      <input className="input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                    </Field>
                    <Field label={t("order.col.motive")} hint={t("order.returnMotiveHint")}>
                      <input className="input" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                    </Field>
                  </div>

                  {order.lines
                    .filter((l) => l.returnable > 0)
                    .map((line) => (
                      <div key={line.id} className="receive-line">
                        <div className="receive-line-head">
                          <strong>{line.item.name}</strong>
                          <span className="muted">
                            {t("order.returnableQty", { quantity: line.returnable, unit: line.item.unit })}
                          </span>
                        </div>
                        <Field label={t("order.returnedQtyLabel", { unit: line.item.unit })}>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={line.returnable}
                            step="any"
                            value={returnDraft[line.id] ?? ""}
                            onChange={(e) => setReturnDraft((prev) => ({ ...prev, [line.id]: e.target.value }))}
                          />
                        </Field>
                      </div>
                    ))}

                  <Banner tone="info">{t("order.returnRestocks")}</Banner>

                  <div className="row-actions">
                    <Button variant="primary" onClick={submitReturn} disabled={busy}>
                      {busy ? t("action.saving") : t("order.saveReturn")}
                    </Button>
                    <Button onClick={() => setReturning(false)}>{t("action.cancel")}</Button>
                  </div>
                </div>
              ) : order.lines.some((l) => l.returnable > 0) ? (
                <Button variant="primary" style={{ marginTop: 10 }} onClick={() => setReturning(true)}>
                  {t("order.addReturn")}
                </Button>
              ) : (
                <p className="muted" style={{ marginTop: 10 }}>
                  {t("order.allReturned")}
                </p>
              )
            ) : null}
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
