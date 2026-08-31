import { useState } from "react";
import { CUSTOM_UNIT, UNIT_GROUPS, isKnownUnit } from "../../lib/units";

interface UnitSelectProps {
  value: string;
  onChange: (unit: string) => void;
  /** Rendered as the id/name hook when the field sits inside a <Field label>. */
  ariaLabel?: string;
}

/**
 * Picks a unit of measure from the known list, with an escape hatch.
 *
 * An article already carrying a unit the list doesn't have (anything typed
 * back when the field was free text) opens straight in custom mode with its
 * value intact, rather than being silently reset to "pièce" — the article's
 * whole history is denominated in that unit.
 */
export function UnitSelect({ value, onChange, ariaLabel = "Unité" }: UnitSelectProps) {
  const [custom, setCustom] = useState(() => value !== "" && !isKnownUnit(value));

  return (
    <div className="unit-select">
      <select
        className="input"
        aria-label={ariaLabel}
        value={custom ? CUSTOM_UNIT : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_UNIT) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(e.target.value);
        }}
      >
        {UNIT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_UNIT}>Autre…</option>
      </select>

      {custom ? (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex. botte"
          aria-label={`${ariaLabel} personnalisée`}
          autoFocus
        />
      ) : null}
    </div>
  );
}
