/**
 * Lightweight pub/sub for upgrade_required events.
 * Components that hit a 403 dispatch this; DashboardClient listens and opens the modal.
 */
type UpgradeHandler = (feature: string) => void;

const handlers = new Set<UpgradeHandler>();

export const upgradeEvents = {
  dispatch(feature: string) {
    handlers.forEach((h) => h(feature));
  },
  subscribe(handler: UpgradeHandler) {
    handlers.add(handler);
    return () => { handlers.delete(handler); };
  },
};
