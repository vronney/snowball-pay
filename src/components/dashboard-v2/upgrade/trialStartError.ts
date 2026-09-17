import { AxiosError } from "axios";
import { getErrorMessage } from "@/lib/hooks";
import { trialStartErrorMessage } from "@/lib/dashboard/upgradeMoments";

/** A failed POST /api/trial/start as one sentence: the named refusals, else the server's message. */
export function trialStartError(error: unknown): string {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return trialStartErrorMessage(status) ?? getErrorMessage(error, "Couldn't start your trial. Try again.");
}
