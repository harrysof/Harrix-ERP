import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { todayIso } from "../../lib/date";
import { ApiError } from "../../lib/api";
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  createEmployee,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  updateEmployee,
  type ApiEmployee,
  type ContractType,
  type EmployeeInput,
  type MaritalStatus,
} from "../../lib/hrApi";

interface EmployeeModalProps {
  employee: ApiEmployee | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create or edit an employee. Fields are grouped the way an Algerian
 * personnel file actually is: identité, contrat, rémunération, contact
 * d'urgence — each section is optional past the handful this factory needs
 * on day one (name, poste, date d'embauche, salaire).
 */
export function EmployeeModal({ employee, onClose, onSaved }: EmployeeModalProps) {
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");
  const [hireDate, setHireDate] = useState(employee?.hireDate.slice(0, 10) ?? todayIso());
  const [birthDate, setBirthDate] = useState(employee?.birthDate?.slice(0, 10) ?? "");
  const [nin, setNin] = useState(employee?.nin ?? "");
  const [cnasNumber, setCnasNumber] = useState(employee?.cnasNumber ?? "");
  const [contractType, setContractType] = useState<ContractType>(employee?.contractType ?? "CDI");
  const [contractEndDate, setContractEndDate] = useState(employee?.contractEndDate?.slice(0, 10) ?? "");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">(employee?.maritalStatus ?? "");
  const [dependentChildren, setDependentChildren] = useState(String(employee?.dependentChildren ?? 0));
  const [salary, setSalary] = useState(String(employee?.salary ?? ""));
  const [bankRib, setBankRib] = useState(employee?.bankRib ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(employee?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(employee?.emergencyContactPhone ?? "");
  const [notes, setNotes] = useState(employee?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !position.trim()) {
      return setError("Le nom complet et le poste sont obligatoires.");
    }
    const salaryValue = Number(salary);
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      return setError("Le salaire doit être un nombre positif.");
    }
    if (contractType === "CDD" && !contractEndDate) {
      return setError("Un CDD doit avoir une date de fin de contrat.");
    }
    const childrenValue = Number(dependentChildren) || 0;

    setError(null);
    setSaving(true);
    try {
      const input: EmployeeInput = {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        position: position.trim(),
        hireDate,
        birthDate: birthDate || undefined,
        nin: nin.trim() || undefined,
        cnasNumber: cnasNumber.trim() || undefined,
        contractType,
        contractEndDate: contractType === "CDD" ? contractEndDate : undefined,
        maritalStatus: maritalStatus || undefined,
        dependentChildren: childrenValue,
        salary: salaryValue,
        bankRib: bankRib.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (employee) await updateEmployee(employee.id, input);
      else await createEmployee(input);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={employee ? `Modifier — ${employee.fullName}` : "Nouvel employé"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement…" : employee ? "Enregistrer" : "Ajouter l'employé"}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <p className="detail-type" style={{ margin: 0 }}>
          Identité
        </p>
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
          <Field label="Date de naissance" hint="Facultatif">
            <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="NIN" hint="Numéro d'identification nationale, facultatif">
            <input className="input" value={nin} onChange={(e) => setNin(e.target.value)} />
          </Field>
          <Field label="N° CNAS" hint="Immatriculation sécurité sociale, facultatif">
            <input className="input" value={cnasNumber} onChange={(e) => setCnasNumber(e.target.value)} />
          </Field>
        </div>

        <p className="detail-type" style={{ margin: "8px 0 0" }}>
          Contrat
        </p>
        <div className="form-row">
          <Field label="Date d'embauche">
            <input className="input" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </Field>
          <Field label="Type de contrat">
            <select className="input" value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTRACT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          {contractType === "CDD" ? (
            <Field label="Fin de contrat">
              <input className="input" type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <div className="form-row">
          <Field label="Situation familiale" hint="Utile pour l'allocation familiale CNAS">
            <select className="input" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | "")}>
              <option value="">— Non précisé —</option>
              {MARITAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MARITAL_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Enfants à charge">
            <input
              className="input"
              type="number"
              min={0}
              max={20}
              value={dependentChildren}
              onChange={(e) => setDependentChildren(e.target.value)}
            />
          </Field>
        </div>

        <p className="detail-type" style={{ margin: "8px 0 0" }}>
          Rémunération
        </p>
        <div className="form-row">
          <Field label="Salaire brut (DZD/mois)">
            <input className="input" type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
          </Field>
          <Field label="RIB" hint="Compte de versement du salaire, facultatif">
            <input className="input" value={bankRib} onChange={(e) => setBankRib(e.target.value)} />
          </Field>
        </div>

        <p className="detail-type" style={{ margin: "8px 0 0" }}>
          Contact d'urgence
        </p>
        <div className="form-row">
          <Field label="Nom">
            <input className="input" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
