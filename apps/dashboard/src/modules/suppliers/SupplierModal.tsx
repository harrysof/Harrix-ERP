import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { Supplier, SupplierInput } from "../../lib/suppliersApi";
import { useI18n } from "../../state/LanguageContext";

export function SupplierModal({
  supplier,
  onClose,
  onSubmit,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (input: SupplierInput) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [registration, setRegistration] = useState(supplier?.registration ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t("supplier.err.name"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        registration: registration.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={supplier ? t("supplier.editTitle", { name: supplier.name }) : t("supplier.newTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("action.saving") : supplier ? t("action.save") : t("supplier.add")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label={t("field.name")}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label={t("supplier.contactPerson")}>
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label={t("field.phone")}>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label={t("field.email")}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("field.address")}>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label={t("supplier.registration")} hint={t("supplier.notesHint")}>
          <input className="input" value={registration} onChange={(e) => setRegistration(e.target.value)} />
        </Field>

        <Field label={t("field.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
