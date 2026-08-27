import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { Supplier, SupplierInput } from "../../lib/suppliersApi";

export function SupplierModal({
  supplier,
  onClose,
  onSubmit,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (input: SupplierInput) => Promise<void> | void;
}) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
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
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={supplier ? `Modifier — ${supplier.name}` : "Nouveau fournisseur"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : supplier ? "Enregistrer" : "Ajouter le fournisseur"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Personne à contacter">
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Adresse">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
