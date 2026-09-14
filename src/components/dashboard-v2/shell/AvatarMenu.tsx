"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { LogOut, Settings, Wallet } from "lucide-react";
import type { Tab } from "@/components/dashboard/types";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

export interface ShellUser {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}

interface AvatarMenuProps {
  user: ShellUser | null;
  initials: string;
  onSelectTab: (tab: Tab) => void;
}

const ITEM =
  "flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-[13px] font-semibold text-txt outline-none hover:bg-bg focus-visible:bg-bg";

/** Account menu (spec §8.3): Income & Budget and Settings, which have no bottom-bar tab, and Sign out. */
export default function AvatarMenu({ user, initials, onSelectTab }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const closeAndRefocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const select = (tab: Tab) => {
    onSelectTab(tab);
    closeAndRefocus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((el): el is HTMLElement => el !== null);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRefocus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-action"
      >
        {user?.picture ? (
          <Image
            src={user.picture}
            alt=""
            width={30}
            height={30}
            referrerPolicy="no-referrer"
            className="h-[30px] w-[30px] rounded-full object-cover"
          />
        ) : (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-2 text-[11px] font-extrabold text-txt">
            {initials}
          </span>
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1.5 shadow-float"
        >
          <button
            ref={(el) => { itemRefs.current[0] = el; }}
            role="menuitem"
            type="button"
            tabIndex={-1}
            onClick={() => select("income")}
            className={ITEM}
          >
            <Wallet size={16} strokeWidth={1.7} aria-hidden="true" />
            Income &amp; Budget
          </button>
          <button
            ref={(el) => { itemRefs.current[1] = el; }}
            role="menuitem"
            type="button"
            tabIndex={-1}
            onClick={() => select("settings")}
            className={ITEM}
          >
            <Settings size={16} strokeWidth={1.7} aria-hidden="true" />
            Settings
          </button>
          <a
            ref={(el) => { itemRefs.current[2] = el; }}
            role="menuitem"
            tabIndex={-1}
            href={LOGOUT_URL}
            onClick={runLogoutClientCleanup}
            className={`${ITEM} border-t border-border text-txt-muted`}
          >
            <LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
            Sign out
          </a>
        </div>
      )}
    </div>
  );
}
