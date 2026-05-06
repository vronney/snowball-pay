import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getOrdinalDay(day: number): string {
  if (!day) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Credit Card': '#f59e0b',
    'Student Loan': '#8b5cf6',
    'Auto Loan': '#06b6d4',
    'Mortgage': '#10b981',
    'Personal Loan': '#f97316',
    'Medical Debt': '#ef4444',
    'Other': '#64748b',
  };
  return colorMap[category] || '#64748b';
}

export function calculateUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return (balance / limit) * 100;
}
