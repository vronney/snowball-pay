/**
 * AprNegotiationCard.tsx
 * -------------------------------------------------------------------------
 * Drop-in Snowball Pay panel: "Negotiate a Lower APR".
 *
 * - Reads the user's tracked cards via `useAprNegotiation()` (which wraps the
 *   existing `useDebts()` query).
 * - Defaults to the highest-APR card, lets the user switch.
 * - Prefills every script + template from that card's real data.
 * - Collects the 3 fields we can't derive (name, credit score, competing offer).
 * - Surfaces the "unknown unknowns" guardrails (SCRA 6% cap, hard-pull, etc.).
 *
 * Uses the repo's UI primitives (Card/Button) + Tailwind + lucide-react.
 * Wire it into a new tab or the Intelligence area.
 * -------------------------------------------------------------------------
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Phone, ClipboardList, FileText, ShieldAlert, CheckCircle2,
  Copy, ChevronRight, ChevronDown, AlertTriangle, Sparkles, Info,
} from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAprNegotiation } from "@/lib/apr-negotiation/useAprNegotiation";
import { computeRateTargets } from "@/lib/apr-negotiation/apr-negotiation-adapter";
import type { Guardrail } from "@/lib/apr-negotiation/apr-negotiation";

const toneStyles: Record<Guardrail["tone"], { wrap: string; icon: JSX.Element }> = {
  opportunity: {
    wrap: "border-emerald-200 bg-emerald-50",
    icon: <Sparkles className="h-4 w-4 text-emerald-600" />,
  },
  caution: {
    wrap: "border-amber-200 bg-amber-50",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  },
  info: {
    wrap: "border-sky-200 bg-sky-50",
    icon: <Info className="h-4 w-4 text-sky-600" />,
  },
};

function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      // Clipboard API unavailable (insecure context) or permission denied.
      setStatus("failed");
    }
    if (resetTimer.current != null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handleCopy}
    >
      {status === "copied" ? (
        <>
          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" /> Copied!
        </>
      ) : status === "failed" ? (
        <>
          <AlertTriangle className="mr-1 h-3 w-3 text-amber-600" /> Copy failed
          — select the text manually
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3 w-3" /> {label}
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {status === "copied"
          ? "Copied to clipboard"
          : status === "failed"
            ? "Copy failed"
            : ""}
      </span>
    </Button>
  );
}

/** Anchor id used by the payoff coach to deep-link into this panel. */
export const APR_NEGOTIATION_ANCHOR = "apr-negotiation";

export function AprNegotiationCard() {
  const n = useAprNegotiation();
  const [activeScript, setActiveScript] = useState(0);
  // Collapsed by default: the Intelligence tab already stacks a full
  // analytics grid above this panel, so the 7-card workspace only renders
  // when the user opens it (or arrives via the coach's deep link).
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Deep-link support: when the payoff coach navigates here with
  // `#apr-negotiation` in the URL, expand the full workspace and scroll it
  // into view once it mounts. The dashboard resets scroll-to-top on every
  // tab switch, so we run this after mount (and after content has loaded)
  // to win that race.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${APR_NEGOTIATION_ANCHOR}`) return;
    if (n.isLoading) return;
    setExpanded(true);
    const el = rootRef.current;
    if (!el) return;
    // rAF ensures layout is settled before we scroll.
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Clear the hash so a later manual tab switch doesn't re-trigger scroll.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    });
    return () => window.cancelAnimationFrame(id);
  }, [n.isLoading]);

  if (n.isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading your cards…
        </CardContent>
      </Card>
    );
  }

  if (!n.cards.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Negotiate a Lower APR</CardTitle>
          <CardDescription>
            Add a credit card to your debts and we&apos;ll build a personalized
            call script and letter to help you lower its interest rate.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const card = n.selectedCard!;
  const script = n.filledScripts[activeScript];
  // Suggested ask, shown as the Target APR placeholder so the user always
  // sees the number the scripts and savings estimate are built on.
  const suggestedTargetApr = computeRateTargets(card.interestRate).targetApr;

  return (
    <div ref={rootRef} id={APR_NEGOTIATION_ANCHOR} className="scroll-mt-20 space-y-4">
      {/* ---- Header + card selector ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Negotiate a Lower APR
          </CardTitle>
          <CardDescription>
            Personalized from your tracked cards. Educational only — not
            financial advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expanded && (
            <div className="flex flex-wrap gap-2">
              {n.cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === card.id}
                  onClick={() => n.selectCard(c.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    c.id === card.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {c.name} · {c.interestRate}% APR
                </button>
              ))}
            </div>
          )}

          {n.estimatedAnnualSavings != null && n.estimatedAnnualSavings > 0 && (
            <p className="text-sm text-muted-foreground">
              Hitting your target rate
              {n.inputs?.targetApr && (
                <>
                  {" "}
                  of{" "}
                  <span className="mono font-medium">{n.inputs.targetApr}%</span>
                </>
              )}{" "}
              on <span className="font-medium">{card.name}</span> could save
              roughly{" "}
              <span className="font-semibold text-emerald-600">
                ${n.estimatedAnnualSavings.toLocaleString()}/yr
              </span>{" "}
              in interest.
            </p>
          )}

          {!expanded && (
            <p className="text-sm text-muted-foreground">
              Inside: word-for-word call scripts, rebuttals for pushback,
              written letter templates, and know-your-rights guardrails —
              prefilled from your card details.
            </p>
          )}

          <Button
            type="button"
            variant={expanded ? "outline" : "default"}
            size="sm"
            aria-expanded={expanded}
            aria-controls="apr-negotiation-details"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={`mr-1 h-3.5 w-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
            {expanded ? "Hide full scripts" : "Open full scripts"}
          </Button>

          {expanded && (
          <>
          {/* ---- Fields we can't derive ---- */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Your name</span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={n.context.fullName ?? ""}
                onChange={(e) => n.setContext({ fullName: e.target.value })}
                placeholder="Ronney Vargas"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Card last 4
              </span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={n.context.cardLast4 ?? ""}
                onChange={(e) =>
                  n.setContext({
                    cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Years with issuer
              </span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={String(n.context.yearsAsCustomer ?? "")}
                onChange={(e) =>
                  n.setContext({
                    yearsAsCustomer: e.target.value.replace(/[^\d]/g, ""),
                  })
                }
                inputMode="numeric"
                placeholder="5"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Credit score</span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={String(n.context.creditScore ?? "")}
                onChange={(e) =>
                  n.setContext({
                    creditScore: e.target.value.replace(/\D/g, "").slice(0, 3),
                  })
                }
                inputMode="numeric"
                maxLength={3}
                placeholder="740"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Target APR (%)
              </span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={String(n.context.targetAprOverride ?? "")}
                onChange={(e) => {
                  // Digits plus at most one decimal point ("18.9.9" would
                  // parse to NaN and silently drop the savings estimate).
                  const raw = e.target.value.replace(/[^\d.]/g, "");
                  const dot = raw.indexOf(".");
                  n.setContext({
                    targetAprOverride:
                      dot === -1
                        ? raw
                        : raw.slice(0, dot + 1) +
                          raw.slice(dot + 1).replace(/\./g, ""),
                  });
                }}
                inputMode="decimal"
                placeholder={suggestedTargetApr}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">
                Competing offer
              </span>
              <input
                className="w-full rounded-lg border border-border px-2 py-1"
                value={n.context.competingOffer ?? ""}
                onChange={(e) => n.setContext({ competingOffer: e.target.value })}
                placeholder="a credit union at 14.99%"
              />
            </label>
          </div>
          {n.missingFields.length > 0 && (
            <p className="text-xs text-amber-600">
              Fill the fields above to complete your scripts — placeholders in
              [brackets] still need your input.
            </p>
          )}
          </>
          )}
        </CardContent>
      </Card>

      {expanded && (
      <div id="apr-negotiation-details" className="space-y-4">
      {/* ---- Guardrails: the "unknown unknowns" ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Know your rights &amp; the traps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {n.guardrails.map((g) => {
            const t = toneStyles[g.tone];
            return (
              <div key={g.id} className={`rounded-lg border p-3 ${t.wrap}`}>
                <div className="flex items-start gap-2">
                  {t.icon}
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{g.body}</p>
                    {g.action && (
                      <a
                        href={g.action.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        {g.action.label} <ChevronRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---- Call scripts ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" /> Call scripts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {n.filledScripts.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={i === activeScript}
                onClick={() => setActiveScript(i)}
                className={`rounded-md border px-2.5 py-1 text-xs transition ${
                  i === activeScript
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border hover:bg-muted"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Use when: {script.useWhen}
          </p>
          <div className="space-y-2">
            {script.lines.map((line, i) => (
              <div
                key={i}
                className={`rounded-md p-2 text-sm ${
                  line.role === "note"
                    ? "bg-muted/60 italic text-muted-foreground"
                    : "bg-background"
                }`}
              >
                {line.role === "you" && (
                  <span className="mr-2 font-semibold text-primary">You:</span>
                )}
                {line.text}
              </div>
            ))}
          </div>
          <CopyButton
            text={script.lines.map((l) => l.text).join("\n")}
            label="Copy script"
          />
        </CardContent>
      </Card>

      {/* ---- Rebuttals ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">If they say no</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {n.rebuttals.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-2 text-sm">
              <p className="font-medium">{r.situation}</p>
              <p className="mt-0.5 text-muted-foreground">{r.response}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- Written templates ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Written templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {n.filledTemplates.map((t) => (
            <details key={t.id} className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {t.title}
              </summary>
              {t.subject && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Subject: {t.subject}
                </p>
              )}
              <pre className="mt-2 whitespace-pre-wrap text-sm">{t.body}</pre>
              <CopyButton className="mt-2" text={t.body} />
            </details>
          ))}
        </CardContent>
      </Card>

      {/* ---- Checklists ---- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Before you call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {n.preCallChecklist.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.detail && (
                    <p className="text-muted-foreground">{item.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" /> After the call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {n.postCallChecklist.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.detail && (
                    <p className="text-muted-foreground">{item.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ---- Sources ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {n.sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              {s.name}
            </a>
          ))}
        </CardContent>
      </Card>
      </div>
      )}
    </div>
  );
}

export default AprNegotiationCard;
