import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftMonth, yearsOf, currentMonthKey } from "../../lib/analyticsApi";
import { formatMonthYear } from "../../lib/format";
import { useI18n } from "../../state/LanguageContext";

/**
 * The dashboard's one filter: which month everything on the page is about.
 *
 * Year and month are two separate selects rather than one long list, because
 * "septembre 2024" is two decisions and a factory that has been running for
 * three years would otherwise scroll through thirty-six options to make them.
 * The arrows either side are for the common case — stepping to the month
 * before or after the one on screen.
 *
 * The month names come from Intl rather than a translated list: they are the
 * same names the dates in every table already use, and keeping one source
 * means the picker can never say "septembre" over a table that says "سبتمبر".
 * In Arabic the layout mirrors on its own — the chevrons are logical
 * properties and the RTL flip makes ‹ mean "next" the way a reader expects.
 *
 * `availableMonths` is what the backend saw activity in. A month outside it is
 * still reachable through the arrows (an empty month is a legitimate answer),
 * so the list guides rather than restricts.
 */
export function MonthPicker({
  month,
  availableMonths,
  onChange,
  busy,
}: {
  month: string;
  availableMonths: string[];
  onChange: (month: string) => void;
  busy?: boolean;
}) {
  const { t, locale } = useI18n();
  const [year, monthNumber] = month.split("-").map(Number);
  const years = yearsOf([...availableMonths, month, currentMonthKey()]);
  const today = currentMonthKey();

  const monthNames = monthNamesFor(locale);

  // Months offered for the chosen year: everything the year actually holds,
  // plus the selected one so the control never disagrees with the page.
  const monthsInYear = new Set(
    availableMonths.filter((m) => m.startsWith(`${year}-`)).map((m) => Number(m.slice(5))),
  );
  monthsInYear.add(monthNumber);

  return (
    <div className="month-picker">
      <button
        type="button"
        className="icon-button month-picker-step"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label={t("month.previous")}
        disabled={busy}
      >
        <ChevronLeft size={17} strokeWidth={2.2} />
      </button>

      <div className="month-picker-selects">
        <select
          className="input month-picker-select"
          value={monthNumber}
          onChange={(e) => onChange(`${year}-${String(Number(e.target.value)).padStart(2, "0")}`)}
          aria-label={t("month.label")}
          disabled={busy}
        >
          {monthNames.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
              {monthsInYear.has(index + 1) ? "" : " —"}
            </option>
          ))}
        </select>
        <select
          className="input month-picker-select month-picker-year"
          value={year}
          onChange={(e) => onChange(`${e.target.value}-${String(monthNumber).padStart(2, "0")}`)}
          aria-label={t("month.year")}
          disabled={busy}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="icon-button month-picker-step"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label={t("month.next")}
        disabled={busy}
      >
        <ChevronRight size={17} strokeWidth={2.2} />
      </button>

      {month !== today ? (
        <button
          type="button"
          className="link-button month-picker-today"
          onClick={() => onChange(today)}
          disabled={busy}
        >
          {t("month.backToToday", { month: formatMonthYear(today) })}
        </button>
      ) : null}
    </div>
  );
}

/** The twelve month names in the active locale — 2020 is an arbitrary non-leap anchor. */
function monthNamesFor(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(Date.UTC(2020, i, 1))));
}
