import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { todayIso } from "../../lib/date";
import type { Employee } from "./types";

export function EmployeeModal({
  employee,
  onClose,
  onSubmit,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSubmit: (input: Pick<Employee, "fullName" | "phone" | "address" | "position" | "hireDate" | "salary">) => void;
}) {
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");
  const [hireDate, setHireDate] = useState(employee?.hireDate ?? todayIso());
  const [salary, setSalary] = useState(String(employee?.salary ?? ""));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!fullName.trim() || !position.trim()) {
      setError("Le nom complet et le poste sont obligatoires.");
      return;
    }
    const salaryValue = Number(salary);
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      setError("Le salaire doit être un nombre positif.");
      return;
    }
    onSubmit({ fullName: fullName.trim(), phone: phone.trim(), address: address.trim(), position: position.trim(), hireDate, salary: salaryValue });
  }

  return (
    <Modal
      title={employee ? `Modifier — ${employee.fullName}` : "Nouvel employé"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {employee ? "Enregistrer" : "Ajouter l'employé"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Nom complet">
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Téléphone">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Poste">
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Date d'embauche">
            <input className="input" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </Field>
          <Field label="Salaire (DZD)">
            <input className="input" type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
          </Field>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
