# apps/mobile — agent notes

- Expo SDK 57 + expo-router. Check `node_modules/expo/bundledNativeModules.json` for the versions Expo pins before adding a package; add nothing beyond the stack table in `README.md` without a stated reason.
- Server state → TanStack Query in `src/lib/queries.ts`. UI state → the single Zustand store. Never cache API responses in Zustand.
- Tokens only via `src/lib/tokens.ts` (expo-secure-store). Never AsyncStorage.
- Styling: NativeWind classes using the tokens in `tailwind.config.js` (transcribed from `../../DESIGN.md`). Blue `primary` only on CTAs, progress fills, active states. Radii are hierarchical: card 12 / input+button 8 / tag 6. Money and dates use `<Num>` (tabular numerals). Win-moment animations use `Easing.bezier(0.22, 1, 0.36, 1)`.
- Funnel rules (see `../../.claude/skills` and the build spec): the calculator needs zero required manual fields, the payoff schedule is never gated, personalization happens before sign-in, upgrade copy cites the user's real interest figure, and the Plaid First-10 gate is untouched.
- Route files under `app/` export only the default component (plus expo-router config). Shared constants live in `src/`.
- Typecheck with `npm run typecheck` before committing. The root web `npm run lint`/`build` ignore this directory.
