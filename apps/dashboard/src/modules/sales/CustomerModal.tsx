import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { createCustomer, updateCustomer, type ApiCustomer, type CustomerInput } from "../../lib/salesApi";

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
  const [form, setForm] = useState<CustomerInput>({
    fullName: customer?.fullName ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    province: customer?.province ?? "",
    country: customer?.country ?? "Algérie",
    postalCode: customer?.postalCode ?? "",
    notes: customer?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<CustomerInput>) => setForm((prev) => ({ ...prev, ...patch }));

  async function handleSave() {
    setError(null);
    if (!form.fullName.trim()) return setError("Le nom complet est obligatoire.");

    // Send only what was filled in — an empty string would fail email validation.
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v !== ""),
    ) as unknown as CustomerInput;
    payload.fullName = form.fullName.trim();

    setSaving(true);
    try {
      if (customer) await updateCustomer(customer.id, payload);
      else await createCustomer(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={customer ? `Modifier ${customer.fullName}` : "Nouveau client"}
      onClose={onClose}
      width={640}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom complet">
          <input className="input" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Email" hint="Facultatif">
            <input className="input" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        <Field label="Adresse">
          <input className="input" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <div className="form-row">
          <Field label="Ville">
            <input className="input" value={form.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="Wilaya / province">
            <input className="input" value={form.province} onChange={(e) => set({ province: e.target.value })} />
          </Field>
          <Field label="Code postal">
            <input className="input" value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} />
          </Field>
          <Field label="Pays">
            <input className="input" value={form.country} onChange={(e) => set({ country: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
