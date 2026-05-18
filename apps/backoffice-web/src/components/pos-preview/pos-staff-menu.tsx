"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Language } from "@/lib/i18n";

type IconName = "sales" | "list" | "stock" | "summary" | "receipt" | "users";

function MenuIcon({ name }: { name: IconName }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  if (name === "sales") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg {...common}>
        <line x1="9" y1="7" x2="20" y2="7" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="17" x2="20" y2="17" />
        <circle cx="5" cy="7" r="1" />
        <circle cx="5" cy="12" r="1" />
        <circle cx="5" cy="17" r="1" />
      </svg>
    );
  }
  if (name === "stock") {
    return (
      <svg {...common}>
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7" />
      </svg>
    );
  }
  if (name === "summary") {
    return (
      <svg {...common}>
        <line x1="4" y1="20" x2="20" y2="20" />
        <rect x="6" y="11" width="3" height="7" />
        <rect x="11" y="8" width="3" height="10" />
        <rect x="16" y="5" width="3" height="13" />
      </svg>
    );
  }
  if (name === "receipt") {
    return (
      <svg {...common}>
        <path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

const items: Record<Language, Array<{ label: string; href: string; icon: IconName }>> = {
  th: [
    { label: "หน้าขาย", href: "/preview/pos", icon: "sales" },
    { label: "รายการขาย", href: "/preview/pos/sales-list", icon: "list" },
    { label: "สินค้าหรือสต็อก", href: "/preview/pos/stock", icon: "stock" },
    { label: "สรุปยอดขาย", href: "/preview/pos/sales-summary", icon: "summary" },
    { label: "เช็คอินหรือใบเสร็จ", href: "/preview/pos/receipts", icon: "receipt" },
    { label: "ผู้ใช้งาน", href: "/preview/pos/users", icon: "users" }
  ],
  en: [
    { label: "Sales", href: "/preview/pos", icon: "sales" },
    { label: "Sales List", href: "/preview/pos/sales-list", icon: "list" },
    { label: "Products / Stock", href: "/preview/pos/stock", icon: "stock" },
    { label: "Sales Summary", href: "/preview/pos/sales-summary", icon: "summary" },
    { label: "Bill / Receipt Check", href: "/preview/pos/receipts", icon: "receipt" },
    { label: "Users", href: "/preview/pos/users", icon: "users" }
  ]
};

export function PosStaffMenu({ lang, collapsed }: { lang: Language; collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mt-2 grid gap-0.5" aria-label={lang === "th" ? "เมนูระบบขายพนักงาน" : "POS staff menu"}>
      {items[lang].map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative inline-flex min-h-10 items-center px-2 text-sm font-semibold leading-tight transition ${
              collapsed ? "justify-center" : "justify-start gap-2"
            } ${
              isActive
                ? "rounded-md bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-blue-400"
                : "text-slate-100/90 hover:text-white"
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className="inline-flex w-4 justify-center" aria-hidden>
              <MenuIcon name={item.icon} />
            </span>
            {!collapsed ? <span className="truncate text-[14px]">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
