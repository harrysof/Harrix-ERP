import { useCallback, useEffect, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { Banner } from "../../components/ui/Banner";
import { EmptyState } from "../../components/ui/EmptyState";
import { ApiError } from "../../lib/api";
import { fetchAudit, fetchAuditFilterOptions, type AuditEntry, type AuditFilters } from "../../lib/authApi";
import { ACTION_LABELS, ACTION_TONES } from "../../lib/auditLabels";
import { entityLabel, AuditChanges } from "./auditChanges";
import { useI18n } from "../../state/LanguageContext";

/**
 * "Log who did what, and when. When the numbers disagree, this is the only
 * thing that settles it." (build plan Phase 2)
 *
 * Read-only by design — there is no edit or delete here, and none on the
 * backend either. A log that can be altered settles nothing.
 */
export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [options, setOptions] = useState<{ entities: string[]; actions: string[] }>({ entities: [], actions: [] });
  const [filters, setFilters] = useState<AuditFilters>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return fetchAudit(filters)
      .then((next) => {
        setEntries(next);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t("adm.loadJournalFailed")))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchAuditFilterOptions().then(setOptions).catch(() => undefined);
  }, []);

  const set = (patch: Partial<AuditFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="page-stack">
      <Banner tone="info">
        Chaque création, modification et suppression est enregistrée ici, avec son auteur et l'heure. Les mots de passe n'y figurent jamais.
        Ce journal ne peut être ni modifié ni effacé.
      </Banner>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <div className="filter-bar">
        <Field label={t("field.from")}>
          <input className="input" type="date" value={filters.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
        </Field>
        <Field label={t("field.to")}>
          <input className="input" type="date" value={filters.to ?? ""} onChange={(e) => set({ to: e.target.value })} />
        </Field>
        <Field label={t("adm.col.action")}>
          <select className="input" value={filters.action ?? ""} onChange={(e) => set({ action: e.target.value })}>
            <option value="">{t("state.allFeminine")}</option>
            {options.actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ? t(ACTION_LABELS[a]) : a}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("adm.col.concerns")}>
          <select className="input" value={filters.entity ?? ""} onChange={(e) => set({ entity: e.target.value })}>
            <option value="">{t("adm.allNeuter")}</option>
            {options.entities.map((e) => (
              <option key={e} value={e}>
                {entityLabel(e, t)}
              </option>
            ))}
          </select>
        </Field>
        {hasFilters ? (
          <Button variant="ghost" onClick={() => setFilters({})}>
            {t("action.reset")}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="loading-text">{t("adm.loadingJournal")}</p>
      ) : entries.length === 0 ? (
        <EmptyState title={t("adm.noActivity")} description={hasFilters ? t("adm.noMatchingEntries") : undefined} />
      ) : (
        <div className="table-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th>{t("adm.col.when")}</th>
                <th>{t("adm.col.who")}</th>
                <th>{t("adm.col.action")}</th>
                <th>{t("adm.col.concerns")}</th>
                <th>{t("adm.col.details")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={entry.action === "LOGIN_FAILED" ? "row-attention" : undefined}>
                  <td className="tabular">{new Date(entry.createdAt).toLocaleString(locale)}</td>
                  <td>
                    {entry.user ? entry.user.fullName : <span className="muted">{entry.userLogin}</span>}
                    <span className="muted"> · {entry.userLogin}</span>
                  </td>
                  <td>
                    <Pill tone={ACTION_TONES[entry.action] ?? "neutral"}>
                      {ACTION_LABELS[entry.action] ? t(ACTION_LABELS[entry.action]) : entry.action}
                    </Pill>
                  </td>
                  <td>{entityLabel(entry.entity, t)}</td>
                  <td>
                    {entry.changes ? (
                      <button type="button" className="link-button" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                        {t(expanded === entry.id ? "adm.hide" : "adm.show")}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                    {expanded === entry.id && entry.changes ? <AuditChanges changes={entry.changes} entity={entry.entity} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
