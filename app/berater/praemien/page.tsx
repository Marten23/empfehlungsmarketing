
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  listRewardRedemptionsForAdvisor,
  listRewardsForAdvisor,
} from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import {
  deleteRewardAction,
  removeRewardImageAction,
  saveRewardAction,
  uploadRewardImageAction,
  updateRedemptionStatusAction,
} from "@/app/berater/praemien/actions";
import { ImageFocusPicker } from "@/app/berater/praemien/image-focus-picker";
import type { RedemptionStatus } from "@/lib/types/domain";
import {
  ArrowUpRightIcon,
  BookIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/app/empfehler/dashboard/components/icons";

const redemptionStatuses: RedemptionStatus[] = [
  "offen",
  "bearbeitet",
  "abgeschlossen",
  "abgelehnt",
];

type AdvisorRewardsPageProps = {
  searchParams: Promise<{
    saved?: string;
    updated?: string;
    reason?: string;
    f_title?: string;
    f_description?: string;
    f_motivation_text?: string;
    f_image_url?: string;
    f_image_source_note?: string;
    f_image_rights_confirmed?: string;
    f_image_focus_x?: string;
    f_image_focus_y?: string;
    f_external_product_url?: string;
    f_points_cost?: string;
    f_is_active?: string;
    deleted?: string;
    upload?: string;
    reward_id?: string;
    show?: string;
    image_removed?: string;
  }>;
};

const panelClass =
  "relative z-10 rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]";
const inputClass =
  "rounded-lg border border-violet-300/55 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 hover:border-violet-400/70 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80";
const hintClass = "mt-1 text-[11px] text-zinc-500";
const primaryButtonClass =
  "rounded-lg border border-violet-300/50 bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-[0_12px_20px_rgba(76,29,149,0.25)]";
const subtleButtonClass =
  "rounded-lg border border-violet-300/55 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-50 hover:ring-1 hover:ring-violet-300/60";

export default async function AdvisorRewardsPage({
  searchParams,
}: AdvisorRewardsPageProps) {
  const params = await searchParams;
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/berater/login");
  }

  const supabase = await createClient();
  let rewards: Awaited<ReturnType<typeof listRewardsForAdvisor>> = [];
  let redemptions: Awaited<ReturnType<typeof listRewardRedemptionsForAdvisor>> = [];
  let loadError: string | null = null;

  try {
    rewards = await listRewardsForAdvisor(supabase, advisorContext.advisorId);
    redemptions = await listRewardRedemptionsForAdvisor(
      supabase,
      advisorContext.advisorId,
    );
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const openCount = redemptions.filter((row) => row.status === "offen").length;
  const activeRewardsCount = rewards.filter((row) => row.is_active).length;
  const inactiveRewardsCount = rewards.length - activeRewardsCount;
  const showAllRewards = params.show === "all";
  const visibleRewards = showAllRewards ? rewards : rewards.slice(0, 10);
  const hasMoreRewards = rewards.length > 10;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[20%] h-[220px] w-[260px] opacity-72">
          <div className="hex-node absolute left-0 top-8 h-14 w-14 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-14 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-30 top-12 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
        <div className="absolute right-[6%] top-[58%] h-[230px] w-[280px] opacity-72">
          <div className="hex-node absolute left-4 top-4 h-16 w-16 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-24 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-44 top-14 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
      </div>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/50 bg-violet-50/86 p-5 shadow-[0_24px_60px_rgba(5,3,12,0.36)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
                <GiftIcon className="h-3.5 w-3.5" />
              </span>
              Prämienbereich
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Prämien verwalten</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Legen Sie Belohnungen für Ihr Empfehlungsprogramm an und pflegen Sie Punkte, Texte und Sichtbarkeit.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200/65 bg-violet-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
              <SparklesIcon className="h-4 w-4" />
              Kurzüberblick
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-800">Aktive Prämien: {activeRewardsCount}</p>
            <p className="mt-1 text-xs text-zinc-600">Offene Einlösungen: {openCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/berater/dashboard"
            className="inline-flex items-center gap-2 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/berater/empfehlungen"
            className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zu Empfehlungen
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>
      <section className="relative z-10 grid gap-4 sm:grid-cols-3">
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Prämien gesamt</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{rewards.length}</p>
        </article>
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Aktiv</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{activeRewardsCount}</p>
        </article>
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Inaktiv</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{inactiveRewardsCount}</p>
        </article>
      </section>

      <section className={`${panelClass} border-amber-300/70 bg-amber-50/95`}>
        <p className="text-sm font-medium text-amber-900">Hinweis zu Bildrechten</p>
        <p className="mt-1 text-sm text-amber-900/90">
          Laden Sie nur Bilder hoch oder verlinken Sie nur Bilder, für die Sie nachweislich Nutzungsrechte besitzen.
        </p>
      </section>

      {params.saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämie gespeichert.
        </p>
      ) : null}
      {params.saved === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämie konnte nicht gespeichert werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.updated === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Einlösungsstatus gespeichert.
        </p>
      ) : null}
      {params.updated === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Einlösungsstatus konnte nicht gespeichert werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.deleted === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämie gelöscht.
        </p>
      ) : null}
      {params.deleted === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämie konnte nicht gelöscht werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.upload === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Bild erfolgreich hochgeladen.
        </p>
      ) : null}
      {params.upload === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Bild-Upload fehlgeschlagen.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.image_removed === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Bild wurde entfernt.
        </p>
      ) : null}
      {params.image_removed === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Bild konnte nicht entfernt werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Daten konnten nicht geladen werden: {loadError}
        </p>
      ) : null}

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
            <BookIcon className="h-4 w-4" />
          </span>
          Bild vom Gerät hochladen
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Hier laden Sie ein Bild hoch und übernehmen die erzeugte Bild-URL direkt ins Formular.
        </p>
        <form action={uploadRewardImageAction} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Bilddatei
            <input required type="file" name="image_file" accept="image/*" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Quelle/Lizenz zum Bild (optional)
            <input
              name="image_source_note"
              defaultValue={params.f_image_source_note ?? ""}
              placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
              className={inputClass}
            />
            <p className={hintClass}>Diese Angabe hilft bei Rückfragen zu Bildrechten.</p>
          </label>
          <label className="md:col-span-2 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 text-xs text-zinc-700">
            <input type="checkbox" name="image_rights_confirmed" value="1" defaultChecked={params.f_image_rights_confirmed === "1"} className="mt-0.5" />
            <span>Ich bestätige, dass ich für dieses Bild die erforderlichen Nutzungsrechte habe.</span>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className={primaryButtonClass}>Bild hochladen und URL übernehmen</button>
          </div>
        </form>
      </section>

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
            <GiftIcon className="h-4 w-4" />
          </span>
          Neue Prämie anlegen
        </h2>
        <p className="mt-1 text-xs text-zinc-600">
          Kompakt anlegen: Titel, Punkte, Sichtbarkeit und optionale Details.
        </p>
        <div className="mt-3">
          <form action={saveRewardAction} className="grid gap-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Titel
            <input required name="title" defaultValue={params.f_title ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Punktewert
            <input required type="number" min={1} name="points_cost" defaultValue={params.f_points_cost ?? ""} className={inputClass} />
            <p className={hintClass}>So viele Punkte benötigt ein Empfehler für diese Prämie.</p>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Sichtbarkeit
            <select name="is_active" defaultValue={params.f_is_active ?? "1"} className={inputClass}>
              <option value="1">aktiv</option>
              <option value="0">inaktiv</option>
            </select>
            <p className={hintClass}>Inaktive Prämien sind für Empfehler nicht sichtbar.</p>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 lg:col-span-3">
            Beschreibung
            <textarea name="description" rows={2} defaultValue={params.f_description ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 lg:col-span-3">
            Motivationstext
            <textarea name="motivation_text" rows={2} defaultValue={params.f_motivation_text ?? ""} className={inputClass} />
            <p className={hintClass}>Dieser Text wird Empfehlern zusätzlich bei der Prämie angezeigt.</p>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Bild-URL (optional)
            <input name="image_url" defaultValue={params.f_image_url ?? ""} className={inputClass} />
            <p className={hintClass}>Wenn gesetzt, wird das Bild in der Prämienübersicht gezeigt.</p>
          </label>
          {params.f_image_url ? (
            <div className="lg:col-span-3">
              <ImageFocusPicker
                imageUrl={params.f_image_url}
                initialX={Number(params.f_image_focus_x ?? "50")}
                initialY={Number(params.f_image_focus_y ?? "50")}
                inputNameX="image_focus_x"
                inputNameY="image_focus_y"
              />
            </div>
          ) : (
            <>
              <input type="hidden" name="image_focus_x" value={params.f_image_focus_x ?? "50"} />
              <input type="hidden" name="image_focus_y" value={params.f_image_focus_y ?? "50"} />
            </>
          )}
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Quelle/Lizenz zum Bild (optional)
            <input
              name="image_source_note"
              defaultValue={params.f_image_source_note ?? ""}
              placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Produktlink (optional)
            <input name="external_product_url" defaultValue={params.f_external_product_url ?? ""} className={inputClass} />
            <p className={hintClass}>Empfehler können die Produktseite später direkt ansehen.</p>
          </label>
          <label className="lg:col-span-3 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-2.5 text-xs text-zinc-700">
            <input type="checkbox" name="image_rights_confirmed" value="1" defaultChecked={params.f_image_rights_confirmed === "1"} className="mt-0.5" />
            <span>Ich bestätige, dass ich für verlinkte oder hochgeladene Bilder die erforderlichen Nutzungsrechte habe.</span>
          </label>
          <div className="lg:col-span-3 flex justify-end">
            <button type="submit" className={primaryButtonClass}>Prämie speichern</button>
          </div>
          </form>
        </div>
      </section>

      <section className="relative z-10 space-y-3">
        <div className={`${panelClass} py-3`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
                  <GiftIcon className="h-4 w-4" />
                </span>
                Bestehende Prämien
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                Übersicht Ihrer angelegten Belohnungen. Mit „Bearbeiten“ klappen Details auf.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-300/55 bg-violet-100/75 px-2.5 py-1 text-xs font-medium text-violet-800">
                {rewards.length} gesamt
              </span>
              {hasMoreRewards ? (
                <Link
                  href={showAllRewards ? "/berater/praemien" : "/berater/praemien?show=all"}
                  className="text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-colors hover:text-violet-900"
                >
                  {showAllRewards ? "Weniger anzeigen" : `Mehr anzeigen (${rewards.length})`}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        {rewards.length === 0 ? (
          <article className={panelClass}>
            <p className="text-sm text-zinc-600">Noch keine Prämien hinterlegt.</p>
          </article>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleRewards.map((reward) => (
              <article key={reward.id} className={`${panelClass} p-3`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {reward.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reward.image_url} alt={reward.title || reward.name || "Prämie"} className="h-12 w-12 rounded-lg object-cover" style={{ objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%` }} />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-violet-200/70 bg-violet-50 text-[10px] text-zinc-500">Kein Bild</div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{reward.title || reward.name}</p>
                    <p className="text-xs text-zinc-600">Punktewert: {reward.points_cost}</p>
                    <p className="mt-1">
                      <span className={reward.is_active ? "rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700" : "rounded bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700"}>
                        {reward.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </p>
                    {reward.external_product_url ? (
                      <a href={reward.external_product_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs text-violet-700 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-900">Produktlink öffnen</a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Kein Produktlink hinterlegt</p>
                    )}
                  </div>
                </div>
                <details className="w-full md:w-auto">
                  <summary className={subtleButtonClass}>Bearbeiten</summary>
                  <div className="mt-3">
                    <form action={saveRewardAction} className="grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="id" value={reward.id} />
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Titel<input required name="title" defaultValue={reward.title || reward.name || ""} className={inputClass} /></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Punktewert<input required type="number" min={1} name="points_cost" defaultValue={reward.points_cost} className={inputClass} /></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">Beschreibung<textarea name="description" rows={2} defaultValue={reward.description ?? ""} className={inputClass} /></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">Motivationstext<textarea name="motivation_text" rows={2} defaultValue={reward.motivation_text ?? ""} className={inputClass} /><p className={hintClass}>Wird Empfehlern direkt bei der Prämie angezeigt.</p></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Bild-URL<input name="image_url" defaultValue={reward.image_url ?? ""} className={inputClass} /></label>
                      {reward.image_url ? (
                        <div className="md:col-span-2"><ImageFocusPicker imageUrl={reward.image_url} initialX={reward.image_focus_x ?? 50} initialY={reward.image_focus_y ?? 50} inputNameX="image_focus_x" inputNameY="image_focus_y" /></div>
                      ) : (
                        <><input type="hidden" name="image_focus_x" value={String(reward.image_focus_x ?? 50)} /><input type="hidden" name="image_focus_y" value={String(reward.image_focus_y ?? 50)} /></>
                      )}
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Quelle/Lizenz zum Bild<input name="image_source_note" defaultValue={reward.image_source_note ?? ""} placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe" className={inputClass} /></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Produktlink<input name="external_product_url" defaultValue={reward.external_product_url ?? ""} className={inputClass} /></label>
                      <label className="md:col-span-2 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 text-xs text-zinc-700">
                        <input type="checkbox" name="image_rights_confirmed" value="1" defaultChecked={reward.image_rights_confirmed} className="mt-0.5" />
                        <span>Ich bestätige die Nutzungsrechte für das verknüpfte Bild.{reward.image_rights_confirmed_at ? <span className="ml-1 text-zinc-500"> (zuletzt bestätigt am {new Date(reward.image_rights_confirmed_at).toLocaleString("de-DE")})</span> : null}</span>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">Sichtbarkeit<select name="is_active" defaultValue={reward.is_active ? "1" : "0"} className={inputClass}><option value="1">aktiv</option><option value="0">inaktiv</option></select></label>
                      <div className="md:col-span-2 flex flex-wrap gap-2"><button type="submit" className={primaryButtonClass}>Änderungen speichern</button><button type="submit" formAction={deleteRewardAction} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">Prämie löschen</button></div>
                    </form>
                    <form action={uploadRewardImageAction} className="mt-3 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50/85 p-3 md:grid-cols-2">
                      <input type="hidden" name="reward_id" value={reward.id} /><input type="hidden" name="image_focus_x" value={String(reward.image_focus_x ?? 50)} /><input type="hidden" name="image_focus_y" value={String(reward.image_focus_y ?? 50)} />
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">Bild für diese Prämie hochladen<input required type="file" name="image_file" accept="image/*" className={inputClass} /></label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">Quelle/Lizenz zum Bild (optional)<input name="image_source_note" defaultValue={reward.image_source_note ?? ""} placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe" className={inputClass} /></label>
                      <label className="md:col-span-2 flex items-start gap-2 text-xs text-zinc-700"><input type="checkbox" name="image_rights_confirmed" value="1" className="mt-0.5" /><span>Ich bestätige die Nutzungsrechte für dieses Bild.</span></label>
                      <div className="md:col-span-2 flex flex-wrap gap-2"><button type="submit" className={subtleButtonClass}>Bild hochladen</button>{reward.image_url ? <button type="submit" formAction={removeRewardImageAction} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100">Bild entfernen</button> : null}</div>
                    </form>
                  </div>
                </details>
              </div>
              {reward.image_url || reward.external_product_url ? (
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/85 p-3">
                  <p className="text-xs font-medium text-zinc-700">Link- und Bildprüfung</p>
                  {reward.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reward.image_url} alt={reward.title || reward.name || "Prämie"} className="mt-2 h-40 w-full max-w-md rounded-lg object-cover" style={{ objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%` }} />
                  ) : <p className="mt-2 text-xs text-zinc-600">Keine Bild-URL hinterlegt.</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">{reward.image_url ? <a href={reward.image_url} target="_blank" rel="noreferrer" className="text-violet-700 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-900">Bild-URL in neuem Tab prüfen</a> : null}{reward.external_product_url ? <a href={reward.external_product_url} target="_blank" rel="noreferrer" className="text-violet-700 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-900">Produktlink in neuem Tab prüfen</a> : null}</div>
                </div>
              ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700"><TrophyIcon className="h-4 w-4" /></span>
          Einlösungen
        </h2>
        <p className="mt-1 text-sm text-zinc-600">Hier sehen Sie offene und bearbeitete Einlösungen inklusive Statussteuerung.</p>
        <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-violet-100/80 bg-violet-50/65">
          <table className="min-w-full text-sm"><thead className="sticky top-0 bg-violet-100/90 text-left text-zinc-600 backdrop-blur"><tr><th className="px-2 py-2">Datum</th><th className="px-2 py-2">Empfehler</th><th className="px-2 py-2">Prämie</th><th className="px-2 py-2">Punkte</th><th className="px-2 py-2">Status</th></tr></thead><tbody className="divide-y divide-violet-100">
              {redemptions.length === 0 ? (<tr><td colSpan={5} className="px-2 py-4 text-zinc-500">Noch keine Einlösungen vorhanden.</td></tr>) : (
                redemptions.map((row) => {
                  const referrerName = row.referrer ? `${row.referrer.first_name} ${row.referrer.last_name}`.trim() : "-";
                  const rewardName = row.reward?.title || row.reward?.name || "Unbekannte Prämie";
                  return (
                    <tr key={row.id} className="transition-colors duration-200 hover:bg-violet-100/65">
                      <td className="px-2 py-2 text-zinc-700">{new Date(row.created_at).toLocaleString("de-DE")}</td>
                      <td className="px-2 py-2 text-zinc-700">{referrerName}{row.referrer?.email ? <span className="ml-1 text-xs text-zinc-500">({row.referrer.email})</span> : null}</td>
                      <td className="px-2 py-2 text-zinc-700">{rewardName}</td>
                      <td className="px-2 py-2 text-zinc-700">-{row.requested_points_cost}</td>
                      <td className="px-2 py-2"><form action={updateRedemptionStatusAction} className="flex gap-2"><input type="hidden" name="redemption_id" value={row.id} /><select name="status" defaultValue={row.status} className={inputClass}>{redemptionStatuses.map((status) => (<option key={status} value={status}>{status}</option>))}</select><button type="submit" className={primaryButtonClass}>Speichern</button></form></td>
                    </tr>
                  );
                })
              )}
            </tbody></table>
        </div>
      </section>
    </div>
  );
}

