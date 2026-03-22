import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  BookIcon,
  GiftIcon,
  SparklesIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

export type AdvisorAreaNavKey =
  | "dashboard"
  | "empfehlungen"
  | "praemien"
  | "referrers"
  | "advisors"
  | "einstellungen"
  | "mein-konto";

type AdvisorAreaHeaderProps = {
  active: AdvisorAreaNavKey;
};

type NavItem = {
  key: AdvisorAreaNavKey;
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { key: "empfehlungen", href: "/berater/empfehlungen", label: "Empfehlungen" },
  { key: "praemien", href: "/berater/praemien", label: "Prämien" },
  { key: "referrers", href: "/berater/dashboard/referrers", label: "Empfehler" },
  { key: "advisors", href: "/berater/dashboard/advisors", label: "Programm" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "B";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export async function AdvisorAreaHeader({ active }: AdvisorAreaHeaderProps) {
  const supabase = await createClient();
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const profileName =
    (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
    advisorContext.advisorName ||
    "Berater";
  const profileAvatar =
    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  return (
    <>
      <header className="relative z-30">
        <div className="mx-auto w-full max-w-7xl px-0">
          <div className="rounded-3xl border border-violet-200/65 bg-violet-50/90 px-4 py-0.5 shadow-[0_20px_44px_rgba(5,3,12,0.34)] backdrop-blur-xl md:px-5 md:py-1">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className="flex items-center gap-2 md:gap-4">
                <Link
                  href="/berater/dashboard"
                  className="inline-flex items-center transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <Image
                    src="/Logo/ChatGPT Image 22. März 2026, 09_33_57.transparent.png"
                    alt="Rewaro"
                    width={260}
                    height={78}
                    className="h-[5.75rem] w-auto md:h-[6rem]"
                    priority
                  />
                </Link>
              </div>

              <nav className="hidden items-center justify-center gap-2 md:flex">
                {navItems.map((item) => {
                  const isActive = active === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`group relative rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "border border-violet-300/70 bg-white text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_20px_rgba(91,33,182,0.12)]"
                          : "text-zinc-700 hover:bg-white/90 hover:text-zinc-900"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`pointer-events-none absolute bottom-1 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-violet-600 transition-all duration-300 ${
                          isActive ? "w-8 opacity-90" : "w-0 opacity-0 group-hover:w-7 group-hover:opacity-80"
                        }`}
                      />
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center justify-end gap-2.5">
                <details className="relative md:hidden">
                  <summary className="list-none cursor-pointer rounded-xl border border-violet-300/55 bg-white/90 px-3 py-1.5 text-sm font-semibold text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition-all hover:bg-violet-100">
                    Menü
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-violet-200/70 bg-white/96 p-2 shadow-[0_20px_40px_rgba(5,3,12,0.28)]">
                    {navItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="block rounded-lg px-2.5 py-2 text-sm text-zinc-800 hover:bg-violet-100/80"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <Link
                      href="/berater/mein-konto"
                      className="mt-1 block rounded-lg px-2.5 py-2 text-sm text-zinc-800 hover:bg-violet-100/80"
                    >
                      Mein Konto
                    </Link>
                    <Link
                      href="/berater/einstellungen"
                      className="mt-1 block rounded-lg px-2.5 py-2 text-sm text-zinc-800 hover:bg-violet-100/80"
                    >
                      Einstellungen
                    </Link>
                  </div>
                </details>

                <details className="relative">
                  <summary className="list-none cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/55 bg-white/88 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(76,29,149,0.14)] transition-all hover:-translate-y-0.5 hover:bg-violet-100/75">
                      {profileAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileAvatar}
                          alt={profileName}
                          className="h-11 w-11 rounded-full border border-violet-300/70 object-cover shadow-[0_10px_22px_rgba(76,29,149,0.26)]"
                        />
                      ) : (
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-violet-300/70 bg-violet-100 text-sm font-semibold text-violet-800 shadow-[0_10px_22px_rgba(76,29,149,0.18)]">
                          {getInitials(profileName)}
                        </span>
                      )}
                      <span className="hidden max-w-[170px] truncate text-sm font-semibold text-zinc-800 lg:inline">
                        {profileName}
                      </span>
                    </span>
                  </summary>

                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-violet-200/70 bg-white/96 p-2 shadow-[0_20px_40px_rgba(5,3,12,0.28)]">
                    <div className="rounded-lg border border-violet-100/80 bg-violet-50/65 px-2.5 py-2">
                      <p className="truncate text-sm font-semibold text-zinc-900">{profileName}</p>
                      <p className="truncate text-xs text-zinc-600">{user?.email ?? "eingeloggt"}</p>
                    </div>
                    <Link
                      href="/berater/mein-konto"
                      className="mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-800 transition-colors hover:bg-violet-100/80"
                    >
                      <UsersIcon className="h-4 w-4 text-violet-700" />
                      Mein Konto
                    </Link>
                    <Link
                      href="/berater/einstellungen"
                      className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-800 transition-colors hover:bg-violet-100/80"
                    >
                      <SparklesIcon className="h-4 w-4 text-violet-700" />
                      Einstellungen
                    </Link>
                    <form action="/auth/logout?next=/berater/login" method="post" className="mt-1">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-800 transition-colors hover:bg-violet-100/80"
                      >
                        <BookIcon className="h-4 w-4 text-violet-700" />
                        Abmelden
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
        {navItems.map((item) => {
          const isActive = active === item.key;
          const Icon =
            item.key === "empfehlungen"
              ? BookIcon
              : item.key === "praemien"
                ? GiftIcon
                : UsersIcon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold ${
                isActive
                  ? "border border-violet-300/65 bg-violet-100/95 text-violet-800"
                  : "border border-violet-200/70 bg-white/85 text-zinc-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}





