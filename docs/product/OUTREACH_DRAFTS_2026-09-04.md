# Outreach drafts — 2026-09-04

Companion to `PRO_CONVERSION_AUDIT_2026-09-04.md`. Four personal emails were drafted in the founder's mailbox on 2026-09-04 (not sent from the repo). The two lifecycle templates below are the copy source for `src/emails/TrialEndingSoonEmail.tsx` and `src/emails/TrialEndedEmail.tsx`, sent by `src/app/api/cron/trial-emails/route.ts`.

Recipients are referred to by role only. Names, addresses, and per-account details live in the founder's mailbox and the private audit report, not in this repository.

Writing rules applied (from the AI Brain): The Mom Test — ask about their life and a specific past moment, never "would you use X"; treat compliments as yellow flags; a reply only counts if it advances (a call, a fact, a decision). Loss framing stays truthful: name exactly what pauses, say nothing is deleted.

## 1. The one external paying customer (P1) — reply on an existing thread

Context: paying since May at a grandfathered price. Gave feedback in June that shaped three fixes. Invited to the bank-sync beta in July, never linked. No payment logged for four weeks. Renews late September.

> Hi {first name},
>
> Checking in, with no agenda beyond this first line: I hope you are doing okay.
>
> I noticed the last payment you logged was {date}, and I want to make sure SnowballPay is still earning its spot for you instead of sitting there charging you {price} a month. Your feedback in June shaped the app more than anyone's, so I'd rather hear it straight.
>
> Two questions, whenever you have a minute:
>
> 1. The last time you opened SnowballPay, what were you there to do, and did it do it?
> 2. Over the past month, how have you been keeping up with your payments instead? Your bank app, paper, memory, nothing at all. There's no wrong answer, I just want the real picture.
>
> If the honest answer is "I haven't needed it," tell me and I'll pause your billing myself, no hoops. If something got in the way (the bank link, a number that looked off, a reminder that got annoying), that's exactly the thing I'll fix first.
>
> And if you'd rather talk than type, I'm happy to do 15 minutes on a call. Reply with a day that works.
>
> Thanks, {first name}. You've helped more than you know.
>
> Ron Vargas, Founder
> SnowballPay.com

## 2. Trial user T1 — heavy tracker (several debts, every payment logged on day one)

> Subject: Quick question about your SnowballPay plan, {first name}
>
> Hi {first name},
>
> I'm Ron. I built SnowballPay. You set up {debt count} debts on {day} and logged all {debt count} payments in one sitting, which almost nobody does on day one. I read every signup myself, and that one stood out.
>
> One question, if you have two minutes: what were you trying to figure out when you sat down to do that? Not what you think of the app. What was going on that day that made you open a debt calculator?
>
> A heads-up so nothing surprises you: every new account gets the full Pro toolkit free for 14 days, and yours runs through {trial end date}. After that your {debt count} debts and your plan stay exactly as they are on Free. The coach notes and the what-if scenarios pause. If you want to keep those it's $12 a month, and if you don't, nothing breaks and nothing is deleted.
>
> Reply here and it comes straight to me.
>
> Ron Vargas, Founder
> SnowballPay.com

## 3. Trial user T2 — more debts than the Free cap, no name on file

> Subject: Quick question about your SnowballPay plan
>
> Hi there,
>
> I'm Ron. I built SnowballPay. You added {debt count} debts on {day}, which puts you in a small group. Most people stop at three or four. I read every signup myself and wanted to reach out directly.
>
> One question: what happened recently that made you sit down and list all {debt count}? Not what you think of the app. What was going on that day?
>
> Two things worth knowing, since {debt count} is more than the Free plan normally tracks:
>
> - Your free Pro window runs through {trial end date}. All {debt count} debts are in your plan now, and they stay in it after the window ends. Nothing gets deleted.
> - After {trial end date}, adding new debts beyond five, the coach notes, and the what-if scenarios pause unless you keep Pro at $12 a month. Your payoff order and debt-free date keep working on Free either way.
>
> Reply here and it comes straight to me.
>
> Ron Vargas, Founder
> SnowballPay.com

## 4. Trial user T3 — trial ends tomorrow, no return visit since signup

> Subject: Your free Pro window ends tomorrow, and one question first
>
> Hi there,
>
> I'm Ron. I built SnowballPay. Your 14 days of free Pro end tomorrow, {trial end date}, and I'd rather you hear it from me than find a locked screen.
>
> What changes: your {debt count} debts and your plan stay exactly as they are. The coach notes and the what-if scenarios pause unless you keep Pro at $12 a month. Nothing is deleted either way, and your payoff order and debt-free date keep working on Free.
>
> One question, whatever you decide. You set up {debt count} debts on {signup date} and haven't been back since. What got in the way? Did the plan tell you what you needed in one sitting, or did something not work? Either answer helps me more than you'd think.
>
> Reply here and it comes straight to me.
>
> Ron Vargas, Founder
> SnowballPay.com

## 5. Lifecycle template — "ending" (`TrialEndingSoonEmail`), automated

Rendered by the cron with these props: `userName` (first name, falls back to "there"), `daysLeft` (2 to 4, drives the subject "{daysLeft} days of free Pro left"), `trialEndDate` ("September 16", America/Chicago), `debtCount`, `interestAvoided` (plan vs minimums, whole dollars; omitted when no plan exists), `monthlyPrice`, `keepProUrl` = `/dashboard?checkout=pro` with UTM tags.

> Subject: {daysLeft} days of free Pro left
>
> {daysLeft} days of free Pro left, {userName}
>
> Every new account gets the full Pro toolkit free for 14 days. Yours ends on {trialEndDate}. Here is exactly what that means, so nothing surprises you.
>
> What stays on Free: all {debtCount} debts, your payoff order, your debt-free date, and every payment you have logged.
>
> What pauses on {trialEndDate}: the coach notes, the what-if scenarios, and adding debts past five.
>
> Your plan is currently on track to avoid {interestAvoided} in interest compared with paying minimums only. That number does not change either way. Pro is for the months after, when balances move and the next safe move needs to stay obvious.
>
> [Keep Pro, {monthlyPrice}/month]({keepProUrl})   ·   Or do nothing and stay on Free. Nothing is deleted.
>
> Reply to this email if something did not work the way you expected. I read every one. — Ron

Send rule (as implemented): the trial end comes from `getSignupTrialEnd()`, anchored to the durable `TrialGrant` (falls back to `createdAt`). `pickTrialEmail` returns `ending` when 2 to 4 days remain. Skipped when the account is paid Pro, when `UserPreferences.emailOptOut` is true (a missing preferences row counts as opted in, the same rule every other lifecycle email uses), or when delivery is already recorded on the grant (`endingEmailSentAt`) or in `actionChecks`. One send per grant.

## 6. Lifecycle template — "ended" (`TrialEndedEmail`), automated

Props: `userName`, `endedOn` ("today" on the boundary's own day, otherwise "on September 5"), `debtCount`, `monthlyPrice`, `keepProUrl`.

> Subject: Your free Pro ended {endedOn}. Your plan did not.
>
> Your 14 days of Pro are done, {userName}. Your {debtCount} debts, your payoff order, and your debt-free date are all still here on Free, along with every payment you logged.
>
> What paused {endedOn}: coach notes, what-if scenarios, and adding debts past five.
>
> If those helped, you can turn them back on in one click: [Keep Pro, {monthlyPrice}/month]({keepProUrl}). If they did not, tell me why by replying to this email. I read every one.
>
> Ron

Send rule (as implemented): `pickTrialEmail` returns `ended` from the trial end through the 7-day post-trial prompt window (`POST_TRIAL_PROMPT_DAYS`), so a run missed on the boundary day still sends within that week, with the copy naming the real date. Same skip rules as above, recorded on the grant as `endedEmailSentAt`. One send per grant.
