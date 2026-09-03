import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with something other than plain text inside it — a
 * bolded clause, a number in its own styling, a link.
 *
 * The alternative, splitting a sentence into "before" and "after" keys, does
 * not survive translation: Arabic puts the emphasised clause in a different
 * place than French does, and a fragment-per-key catalogue forces the
 * translator to guess the surrounding word order. Here the whole sentence is
 * one key with a `{name}` placeholder, and the placeholder is filled with a
 * node — so each language keeps its own order.
 *
 *   <Rich text={t("dash.estimateWarning")} parts={{ lead: <strong>…</strong> }} />
 */
export function Rich({ text, parts }: { text: string; parts: Record<string, ReactNode> }) {
  const segments = text.split(/(\{\w+\})/g);
  return (
    <>
      {segments.map((segment, index) => {
        const match = /^\{(\w+)\}$/.exec(segment);
        if (match && match[1] in parts) return <Fragment key={index}>{parts[match[1]]}</Fragment>;
        return <Fragment key={index}>{segment}</Fragment>;
      })}
    </>
  );
}
