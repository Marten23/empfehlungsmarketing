import { createClient } from "@/lib/supabase/server";
import { getPublicLinkContext } from "@/lib/queries/public-referral";

type PartnerInvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function PartnerInvitePage({ params }: PartnerInvitePageProps) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const context = await getPublicLinkContext(supabase, code);

  if (!context || context.link_type !== "advisor") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">Berater-Einladung</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dieser Berater-Einladungslink ist ungültig oder nicht mehr aktiv.
        </p>
      </main>
    );
  }

  const signupHref = `/signup?invite=${encodeURIComponent(code)}&invite_type=advisor`;
  const switchAccountHref = `/auth/start-advisor-signup?invite=${encodeURIComponent(code)}&invite_type=advisor`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Berater-Einladung</h1>
        <p className="text-sm text-zinc-600">
          Sie wurden von <span className="font-medium">{context.advisor_name}</span>{" "}
          eingeladen.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
        <p className="text-sm text-zinc-700">
          Registrieren Sie sich als Berater. Die Zuordnung zur Einladung ist bereits
          im Link enthalten.
        </p>
        {user ? (
          <a
            href={switchAccountHref}
            className="mt-4 inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Abmelden und als Berater registrieren
          </a>
        ) : (
          <a
            href={signupHref}
            className="mt-4 inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Als Berater registrieren
          </a>
        )}
      </section>
    </main>
  );
}
