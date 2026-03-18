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

export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'Credit Card': 'credit-card',
    'Student Loan': 'graduation-cap',
    'Auto Loan': 'car',
    'Mortgage': 'home',
    'Personal Loan': 'user',
    'Medical Debt': 'heart-pulse',
    'Other': 'circle-dot',
  };
  return iconMap[category] || 'circle-dot';
}

export function calculateUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return (balance / limit) * 100;
}

export function getUtilizationColor(utilization: number): string {
  if (utilization > 90) return '#ef4444'; // red
  if (utilization > 50) return '#f59e0b'; // amber
  return '#10b981'; // green
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function parseTimeFormat(timeString: string): { years: number; months: number } {
  const yearMatch = timeString.match(/(\d+)y/);
  const monthMatch = timeString.match(/(\d+)m/);
  
  return {
    years: yearMatch ? parseInt(yearMatch[1]) : 0,
    months: monthMatch ? parseInt(monthMatch[1]) : 0,
  };
}
