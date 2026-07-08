/**
 * useAprNegotiation.ts
 * -------------------------------------------------------------------------
 * React hook that wires the APR-negotiation content to a user's tracked
 * cards in Snowball Pay. It reads the existing `useDebts()` TanStack query,
 * filters to credit cards, and produces fully-personalized scripts,
 * templates, checklists, and guardrails for the selected card.
 *
 * Place in `src/lib/apr-negotiation/` (or wherever the content module lives).
 * Adjust the `useDebts` import path to your project (it's `@/lib/hooks` in
 * the current repo).
 * -------------------------------------------------------------------------
 */

"use client";

import { useMemo, useState } from "react";
// Existing Snowball Pay data hook — returns { debts: Debt[] }.
import { useDebts } from "@/lib/hooks";
import type { Debt } from "@/types";

import {
  aprNegotiationContent,
  fillTemplate,
  type CallScript,
  type WrittenTemplate,
  type Rebuttal,
  type NegotiationInputs,
} from "./apr-negotiation";
import {
  buildNegotiationInputs,
  isNegotiableCard,
  missingInputFields,
  computeRateTargets,
  type UserSuppliedContext,
} from "./apr-negotiation-adapter";

export interface UseAprNegotiationResult {
  /** Loading/error passthrough from useDebts. */
  isLoading: boolean;
  isError: boolean;

  /** Only credit-card debts — the ones this feature applies to. */
  cards: Debt[];

  /** Currently selected card (defaults to highest-APR card). */
  selectedCard: Debt | null;
  selectCard: (debtId: string) => void;

  /** Extra context the user provides (name, score, competing offer, overrides). */
  context: UserSuppliedContext;
  setContext: (patch: Partial<UserSuppliedContext>) => void;

  /** Fully-personalized inputs for the selected card + context. */
  inputs: NegotiationInputs | null;

  /** Placeholder fields the user still needs to fill (drive a nudge from this). */
  missingFields: (keyof NegotiationInputs)[];

  /** Content, with {{placeholders}} already interpolated for the selected card. */
  filledScripts: CallScript[];
  filledTemplates: WrittenTemplate[];
  /** Rebuttals with {{placeholders}} interpolated for the selected card. */
  rebuttals: Rebuttal[];

  /** Static content (no interpolation needed). */
  preCallChecklist: typeof aprNegotiationContent.preCallChecklist;
  postCallChecklist: typeof aprNegotiationContent.postCallChecklist;
  guardrails: typeof aprNegotiationContent.guardrails;
  quickFacts: typeof aprNegotiationContent.quickFacts;
  sources: typeof aprNegotiationContent.sources;

  /** Estimated annual interest saved if the target rate is achieved. */
  estimatedAnnualSavings: number | null;
}

function fillScript(script: CallScript, inputs: NegotiationInputs): CallScript {
  return {
    ...script,
    lines: script.lines.map((l) => ({ ...l, text: fillTemplate(l.text, inputs) })),
  };
}

function fillTemplateDoc(doc: WrittenTemplate, inputs: NegotiationInputs): WrittenTemplate {
  return {
    ...doc,
    subject: doc.subject ? fillTemplate(doc.subject, inputs) : doc.subject,
    body: fillTemplate(doc.body, inputs),
  };
}

function fillRebuttal(r: Rebuttal, inputs: NegotiationInputs): Rebuttal {
  return {
    ...r,
    situation: fillTemplate(r.situation, inputs),
    response: fillTemplate(r.response, inputs),
  };
}

/** Rough annual interest saving = balance * (currentAPR - targetAPR) / 100. */
function estimateAnnualSavings(balance: number, currentApr: number, targetApr: number): number | null {
  if (![balance, currentApr, targetApr].every(Number.isFinite)) return null;
  const delta = currentApr - targetApr;
  if (delta <= 0) return 0;
  return Math.round((balance * delta) / 100);
}

export function useAprNegotiation(): UseAprNegotiationResult {
  const { data, isLoading, isError } = useDebts();

  // Credit cards only, sorted by APR descending (best negotiation candidates first).
  const cards = useMemo<Debt[]>(() => {
    const all = data?.debts ?? [];
    return all
      .filter((d) => isNegotiableCard(d))
      .sort((a, b) => b.interestRate - a.interestRate);
  }, [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [context, setContextState] = useState<UserSuppliedContext>({});

  const selectedCard = useMemo<Debt | null>(() => {
    if (!cards.length) return null;
    return cards.find((c) => c.id === selectedId) ?? cards[0]; // default: highest APR
  }, [cards, selectedId]);

  const inputs = useMemo<NegotiationInputs | null>(() => {
    if (!selectedCard) return null;
    return buildNegotiationInputs(selectedCard, context);
  }, [selectedCard, context]);

  const filledScripts = useMemo<CallScript[]>(() => {
    if (!inputs) return aprNegotiationContent.callScripts;
    return aprNegotiationContent.callScripts.map((s) => fillScript(s, inputs));
  }, [inputs]);

  const filledTemplates = useMemo<WrittenTemplate[]>(() => {
    if (!inputs) return aprNegotiationContent.writtenTemplates;
    return aprNegotiationContent.writtenTemplates.map((t) => fillTemplateDoc(t, inputs));
  }, [inputs]);

  const filledRebuttals = useMemo<Rebuttal[]>(() => {
    if (!inputs) return aprNegotiationContent.rebuttals;
    return aprNegotiationContent.rebuttals.map((r) => fillRebuttal(r, inputs));
  }, [inputs]);

  const estimatedAnnualSavings = useMemo<number | null>(() => {
    if (!selectedCard) return null;
    const { targetApr } = computeRateTargets(selectedCard.interestRate);
    return estimateAnnualSavings(
      selectedCard.balance,
      selectedCard.interestRate,
      Number(context.targetAprOverride ?? targetApr)
    );
  }, [selectedCard, context.targetAprOverride]);

  return {
    isLoading,
    isError,
    cards,
    selectedCard,
    selectCard: setSelectedId,
    context,
    setContext: (patch) => setContextState((prev) => ({ ...prev, ...patch })),
    inputs,
    missingFields: inputs ? missingInputFields(inputs) : [],
    filledScripts,
    filledTemplates,
    rebuttals: filledRebuttals,
    preCallChecklist: aprNegotiationContent.preCallChecklist,
    postCallChecklist: aprNegotiationContent.postCallChecklist,
    guardrails: aprNegotiationContent.guardrails,
    quickFacts: aprNegotiationContent.quickFacts,
    sources: aprNegotiationContent.sources,
    estimatedAnnualSavings,
  };
}
