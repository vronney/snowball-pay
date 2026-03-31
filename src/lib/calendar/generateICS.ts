interface DebtForCalendar {
  id: string;
  name: string;
  minimumPayment: number;
  dueDate: number;
  category: string;
  balance: number;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/** Returns the next calendar date (YYYYMMDD) on which the given day-of-month falls. */
function nextOccurrence(dueDay: number): string {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth(); // 0-indexed

  // If due day has already passed this month, move to next month
  if (dueDay < today.getDate()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  // Clamp to last day of that month (e.g. day 31 in April → day 30)
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDay);

  return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

export function generateICS(debts: DebtForCalendar[]): string {
  const debtsWithDue = debts.filter((d) => d.dueDate != null);

  const events = debtsWithDue.map((debt) => {
    const dtstart = nextOccurrence(debt.dueDate);
    const summary = escapeICS(
      `${debt.name} — $${debt.minimumPayment.toFixed(2)} Due`,
    );
    const description = escapeICS(
      `Minimum payment: $${debt.minimumPayment.toFixed(2)}\nBalance: $${debt.balance.toFixed(2)}\nCategory: ${debt.category}`,
    );

    return [
      'BEGIN:VEVENT',
      `UID:snowballpay-${debt.id}-due`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      // Use BYMONTHDAY=-1 (last day) for days 29-31 so no month is skipped.
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${debt.dueDate >= 29 ? -1 : debt.dueDate}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SnowballPay//Debt Due Dates//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Debt Due Dates — SnowballPay',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
