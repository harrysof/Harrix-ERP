import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { useI18n } from "../../state/LanguageContext";
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
  const { t } = useI18n();
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
  const [expectedHoursPerDay, setExpectedHoursPerDay] = useState(String(employee?.expectedHoursPerDay ?? 8));
  const [bankRib, setBankRib] = useState(employee?.bankRib ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(employee?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(employee?.emergencyContactPhone ?? "");
  const [notes, setNotes] = useState(employee?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !position.trim()) {
      return setError(t("hr.err.nameAndPosition"));
    }
    const salaryValue = Number(salary);
    if (!Number.isFinite(salaryValue) || salaryValue < 0) {
      return setError(t("hr.err.salary"));
    }
    const expectedHoursValue = Number(expectedHoursPerDay);
    if (!Number.isFinite(expectedHoursValue) || expectedHoursValue < 1 || expectedHoursValue > 24) {
      return setError(t("hr.err.hours"));
    }
    if (contractType === "CDD" && !contractEndDate) {
      return setError(t("hr.err.cddEnd"));
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
        expectedHoursPerDay: expectedHoursValue,
        bankRib: bankRib.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (employee) await updateEmployee(employee.id, input);
      else await createEmployee(input);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={employee ? t("hr.editTitle", { name: employee.fullName }) : t("hr.newTitle")}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? t("action.saving") : employee ? t("action.save") : t("hr.add")}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <p className="detail-type" style={{ margin: 0 }}>
          {t("hr.identity")}
        </p>
        <Field label={t("field.fullName")}>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </Field>
        <div className="form-row">
          <Field label={t("field.phone")}>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={t("hr.col.position")}>
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
          <Field label={t("hr.birthDate")} hint={t("state.optional")}>
            <input className="input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t("field.address")}>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="form-row">
          <Field label={t("hr.nin")} hint={t("hr.ninHint")}>
            <input className="input" value={nin} onChange={(e) => setNin(e.target.value)} />
          </Field>
          <Field label={t("hr.cnasNumber")} hint={t("hr.cnasHint")}>
            <input className="input" value={cnasNumber} onChange={(e) => setCnasNumber(e.target.value)} />
          </Field>
        </div>

        <p className="detail-type" style={{ margin: "8px 0 0" }}>
          {t("hr.contractSection")}
        </p>
        <div className="form-row">
          <Field label={t("hr.hireDate")}>
            <input className="input" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </Field>
          <Field label={t("hr.contractType")}>
            <select className="input" value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
              {CONTRACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(CONTRACT_TYPE_LABELS[type])}
                </option>
              ))}
            </select>
          </Field>
          {contractType === "CDD" ? (
            <Field label={t("hr.contractEnd")}>
              <input className="input" type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <div className="form-row">
          <Field label={t("hr.maritalStatus")} hint={t("hr.maritalHint")}>
            <select className="input" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | "")}>
              <option value="">{t("hr.unspecified")}</option>
              {MARITAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(MARITAL_STATUS_LABELS[s])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("hr.dependents")}>
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
          {t("hr.paySection")}
        </p>
        <div className="form-row">
          <Field label={t("hr.salary")}>
            <input className="input" type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
          </Field>
          <Field label={t("hr.expectedHours")} hint={t("hr.expectedHoursHint")}>
            <input
              className="input"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={expectedHoursPerDay}
              onChange={(e) => setExpectedHoursPerDay(e.target.value)}
            />
          </Field>
          <Field label={t("hr.rib")} hint={t("hr.ribHint")}>
            <input className="input" value={bankRib} onChange={(e) => setBankRib(e.target.value)} />
          </Field>
        </div>

        <p className="detail-type" style={{ margin: "8px 0 0" }}>
          {t("hr.emergencyContact")}
        </p>
        <div className="form-row">
          <Field label={t("field.name")}>
            <input className="input" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
          </Field>
          <Field label={t("field.phone")}>
            <input className="input" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
          </Field>
        </div>

        <Field label={t("field.notes")}>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
