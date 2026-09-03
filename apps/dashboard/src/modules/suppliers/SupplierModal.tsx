import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { ImagePicker } from "../../components/ui/ImagePicker";
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
  const [nif, setNif] = useState(supplier?.nif ?? "");
  const [rc, setRc] = useState(supplier?.rc ?? "");
  const [ai, setAi] = useState(supplier?.ai ?? "");
  const [nis, setNis] = useState(supplier?.nis ?? "");
  const [photoUrl, setPhotoUrl] = useState(supplier?.photoUrl ?? "");
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
        nif: nif.trim() || undefined,
        rc: rc.trim() || undefined,
        ai: ai.trim() || undefined,
        nis: nis.trim() || undefined,
        photoUrl: photoUrl.trim() || null,
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
        <div className="form-row">
          <Field label={t("field.nif")} hint={t("field.nifHint")}>
            <input className="input" value={nif} onChange={(e) => setNif(e.target.value)} />
          </Field>
          <Field label={t("field.rc")} hint={t("field.rcHint")}>
            <input className="input" value={rc} onChange={(e) => setRc(e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label={t("field.ai")} hint={t("field.aiHint")}>
            <input className="input" value={ai} onChange={(e) => setAi(e.target.value)} />
          </Field>
          <Field label={t("field.nis")} hint={t("field.nisHint")}>
            <input className="input" value={nis} onChange={(e) => setNis(e.target.value)} />
          </Field>
        </div>
        <Field label={t("supplier.photoLabel")}>
          <ImagePicker value={photoUrl || null} onChange={(value) => setPhotoUrl(value ?? "")} />
        </Field>

        <Field label={t("field.notes")}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
