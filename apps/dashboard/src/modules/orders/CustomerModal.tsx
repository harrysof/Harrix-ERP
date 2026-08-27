import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import type { Customer } from "./types";

export function CustomerModal({
  customer,
  onClose,
  onSubmit,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (input: Pick<Customer, "fullName" | "email" | "phone" | "address">) => void;
}) {
  const [fullName, setFullName] = useState(customer?.fullName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!fullName.trim()) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
  }

  return (
    <Modal
      title={customer ? `Modifier — ${customer.fullName}` : "Nouveau client"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {customer ? "Enregistrer" : "Ajouter le client"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom complet">
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
