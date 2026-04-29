import { type LucideIcon } from "lucide-react";

export type Tab =
  | "home"
  | "debts"
  | "income"
  | "plan"
  | "progress"
  | "intelligence"
  | "journey"
  | "help"
  | "settings";

export interface Notification {
  id: string;
  type: "urgent" | "warning" | "info";
  icon: LucideIcon;
  title: string;
  body: string;
  tab?: Tab;
  debtId?: string;
  debtAmount?: number;
  daysUntil?: number; // set for due-date notifications; used for sorting and color coding
}
