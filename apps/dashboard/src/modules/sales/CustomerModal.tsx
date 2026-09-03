import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ImagePicker } from "../../components/ui/ImagePicker";
import { ApiError } from "../../lib/api";
import { createCustomer, updateCustomer, type ApiCustomer, type CustomerInput } from "../../lib/salesApi";
import { useI18n } from "../../state/LanguageContext";

/** §18: add / edit a customer, including the structured address §17 needs. */
export function CustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: ApiCustomer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<CustomerInput>({
    fullName: customer?.fullName ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    province: customer?.province ?? "",
    country: customer?.country ?? t("customer.defaultCountry"),
    postalCode: customer?.postalCode ?? "",
    nif: customer?.nif ?? "",
    rc: customer?.rc ?? "",
    ai: customer?.ai ?? "",
    nis: customer?.nis ?? "",
    photoUrl: customer?.photoUrl ?? "",
    notes: customer?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<CustomerInput>) => setForm((prev) => ({ ...prev, ...patch }));

  async function handleSave() {
    setError(null);
    if (!form.fullName.trim()) return setError(t("customer.err.fullName"));

    // Send only what was filled in — an empty string would fail email validation.
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v !== ""),
    ) as unknown as CustomerInput;
    payload.fullName = form.fullName.trim();
    // Explicit null (not omitted) so the "Retirer" button in ImagePicker
    // actually clears a previously saved photo instead of leaving it as-is.
    payload.photoUrl = (form.photoUrl ?? "").trim() || null;

    setSaving(true);
    try {
      if (customer) await updateCustomer(customer.id, payload);
      else await createCustomer(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={customer ? t("customer.editTitle", { name: customer.fullName }) : t("customer.newTitle")}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button onClick={onClose}>{t("action.cancel")}</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("action.saving") : t("action.save")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label={t("field.fullName")}>
          <input className="input" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} autoFocus />
        </Field>
        <div className="form-row">
          <Field label={t("field.email")} hint={t("state.optional")}>
            <input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label={t("field.phone")}>
            <input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        <Field label={t("field.address")}>
          <input className="input" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <div className="form-row">
          <Field label={t("field.city")}>
            <input className="input" value={form.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label={t("customer.province")}>
            <input className="input" value={form.province} onChange={(e) => set({ province: e.target.value })} />
          </Field>
          <Field label={t("customer.postalCode")}>
            <input className="input" value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} />
          </Field>
          <Field label={t("customer.country")}>
            <input className="input" value={form.country} onChange={(e) => set({ country: e.target.value })} />
          </Field>
        </div>
        <div className="form-row">
          <Field label={t("field.nif")} hint={t("field.nifHint")}>
            <input className="input" value={form.nif} onChange={(e) => set({ nif: e.target.value })} />
          </Field>
          <Field label={t("field.rc")} hint={t("field.rcHint")}>
            <input className="input" value={form.rc} onChange={(e) => set({ rc: e.target.value })} />
          </Field>
        </div>
        <div className="form-row">
          <Field label={t("field.ai")} hint={t("field.aiHint")}>
            <input className="input" value={form.ai} onChange={(e) => set({ ai: e.target.value })} />
          </Field>
          <Field label={t("field.nis")} hint={t("field.nisHint")}>
            <input className="input" value={form.nis} onChange={(e) => set({ nis: e.target.value })} />
          </Field>
        </div>
        <Field label={t("customer.photoLabel")}>
          <ImagePicker value={form.photoUrl || null} onChange={(value) => set({ photoUrl: value ?? "" })} />
        </Field>
        <Field label={t("field.notes")}>
          <input className="input" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
