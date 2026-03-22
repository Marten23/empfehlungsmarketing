
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
  createRewardSurveyAction,
  deleteRewardSurveyAction,
  deleteRewardAction,
  saveRewardAction,
  updateRewardSurveyAction,
  uploadRewardImageAction,
  updateRedemptionStatusAction,
} from "@/app/berater/praemien/actions";
import { ImageFocusPicker } from "@/app/berater/praemien/image-focus-picker";
import { SurveyCreateForm } from "@/app/berater/praemien/survey-create-form";
import { RewardEditModal } from "@/app/berater/praemien/reward-edit-modal";
import { SurveyOverviewTrigger } from "@/app/berater/praemien/survey-overview-trigger";
import type { RedemptionStatus } from "@/lib/types/domain";
import {
  ArrowUpRightIcon,
  BookIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";

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
    survey_saved?: string;
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
  let surveyRows: Array<{
    id: string;
    title: string;
    description: string | null;
    survey_type: string;
    is_active: boolean;
    created_at: string;
    ends_at: string | null;
    budget_limit_eur: number | null;
  }> = [];
  const surveyOptionTextById = new Map<string, string>();
  const surveyOptionsBySurvey = new Map<string, Array<{ id: string; text: string }>>();
  const surveyVoteCountByOptionId = new Map<string, number>();
  const surveyOptionCountBySurvey = new Map<string, number>();
  const surveyResponseCountBySurvey = new Map<string, number>();
  const surveyResponsesBySurvey = new Map<
    string,
    Array<{
      id: string;
      referrerName: string;
      selectedOptions: string[];
      note: string | null;
      createdAt: string;
    }>
  >();
  let loadError: string | null = null;

  try {
    rewards = await listRewardsForAdvisor(supabase, advisorContext.advisorId);
    redemptions = await listRewardRedemptionsForAdvisor(
      supabase,
      advisorContext.advisorId,
    );

    const { data: surveys, error: surveysError } = await supabase
      .from("reward_surveys")
      .select("id, title, description, survey_type, is_active, created_at, ends_at, budget_limit_eur")
      .eq("advisor_id", advisorContext.advisorId)
      .order("created_at", { ascending: false })
      .limit(6);
    if (surveysError) throw surveysError;
    surveyRows = (surveys ?? []) as typeof surveyRows;

    const surveyIds = surveyRows.map((row) => row.id);
    if (surveyIds.length > 0) {
      const [{ data: options }, { data: responses }, { data: responseOptions }] = await Promise.all([
        supabase
          .from("reward_survey_options")
          .select("id, survey_id, option_text")
          .eq("advisor_id", advisorContext.advisorId)
          .in("survey_id", surveyIds),
        supabase
          .from("reward_survey_responses")
          .select("id, survey_id, selected_option_id, free_suggestion, created_at, referrers(first_name, last_name)")
          .eq("advisor_id", advisorContext.advisorId)
          .in("survey_id", surveyIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("reward_survey_response_options")
          .select("response_id, option_id, survey_id")
          .in("survey_id", surveyIds),
      ]);

      for (const row of (options ?? []) as Array<{
        id: string | null;
        survey_id: string | null;
        option_text: string | null;
      }>) {
        const surveyId = String(row.survey_id ?? "");
        if (!surveyId) continue;
        const optionId = String(row.id ?? "");
        const optionText = String(row.option_text ?? "").trim();
        if (optionId && optionText) {
          surveyOptionTextById.set(optionId, optionText);
          const optionRows = surveyOptionsBySurvey.get(surveyId) ?? [];
          optionRows.push({ id: optionId, text: optionText });
          surveyOptionsBySurvey.set(surveyId, optionRows);
        }
        surveyOptionCountBySurvey.set(
          surveyId,
          (surveyOptionCountBySurvey.get(surveyId) ?? 0) + 1,
        );
      }
      for (const row of (responses ?? []) as Array<{ survey_id: string | null }>) {
        const surveyId = String(row.survey_id ?? "");
        if (!surveyId) continue;
        surveyResponseCountBySurvey.set(
          surveyId,
          (surveyResponseCountBySurvey.get(surveyId) ?? 0) + 1,
        );
      }

      const optionIdsByResponse = new Map<string, string[]>();
      const responseIdsWithMultiSelect = new Set<string>();
      for (const row of (responseOptions ?? []) as Array<{
        response_id: string | null;
        option_id: string | null;
      }>) {
        const responseId = String(row.response_id ?? "");
        const optionId = String(row.option_id ?? "");
        if (!responseId || !optionId) continue;
        responseIdsWithMultiSelect.add(responseId);
        const optionsForResponse = optionIdsByResponse.get(responseId) ?? [];
        optionsForResponse.push(optionId);
        optionIdsByResponse.set(responseId, optionsForResponse);
        surveyVoteCountByOptionId.set(
          optionId,
          (surveyVoteCountByOptionId.get(optionId) ?? 0) + 1,
        );
      }

      for (const row of (responses ?? []) as Array<{
        id: string | null;
        survey_id: string | null;
        selected_option_id: string | null;
        free_suggestion: string | null;
        created_at: string | null;
        referrers:
          | {
              first_name?: string | null;
              last_name?: string | null;
            }
          | Array<{
              first_name?: string | null;
              last_name?: string | null;
            }>
          | null;
      }>) {
        const surveyId = String(row.survey_id ?? "");
        const responseId = String(row.id ?? "");
        if (!surveyId || !responseId) continue;
        const referrerRecord = Array.isArray(row.referrers)
          ? row.referrers[0]
          : row.referrers;
        const firstName = String(referrerRecord?.first_name ?? "").trim();
        const lastName = String(referrerRecord?.last_name ?? "").trim();
        const referrerName =
          `${firstName} ${lastName}`.trim() ||
          "Empfehler";
        const optionIds = optionIdsByResponse.get(responseId) ?? [];
        const fallbackOptionId = String(row.selected_option_id ?? "");
        const normalizedOptionIds =
          optionIds.length > 0
            ? optionIds
            : fallbackOptionId
                ? [fallbackOptionId]
                : [];
        if (
          fallbackOptionId &&
          !responseIdsWithMultiSelect.has(responseId)
        ) {
          surveyVoteCountByOptionId.set(
            fallbackOptionId,
            (surveyVoteCountByOptionId.get(fallbackOptionId) ?? 0) + 1,
          );
        }
        const selectedOptions = normalizedOptionIds
          .map((optionId) => surveyOptionTextById.get(optionId))
          .filter((value): value is string => Boolean(value));
        const rowsForSurvey = surveyResponsesBySurvey.get(surveyId) ?? [];
        rowsForSurvey.push({
          id: responseId,
          referrerName,
          selectedOptions,
          note: row.free_suggestion ?? null,
          createdAt: String(row.created_at ?? ""),
        });
        surveyResponsesBySurvey.set(surveyId, rowsForSurvey);
      }
    }
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
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
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

      <AdvisorAreaHeader active="praemien" />

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
      <section className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <SurveyOverviewTrigger
          title="Prämien-Umfrage"
          subtitle="Empfehler-Wünsche erfassen"
          countLabel={`${surveyRows.length}`}
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SurveyCreateForm
              rewards={rewards.filter((reward) => reward.is_active).slice(0, 12).map((reward) => ({
                id: reward.id,
                title: reward.title || reward.name || "Prämie",
              }))}
              inputClass={inputClass}
              primaryButtonClass={primaryButtonClass}
              createRewardSurveyAction={createRewardSurveyAction}
            />

            <aside className="rounded-xl border border-violet-200/70 bg-violet-50/65 p-3">
              <p className="text-sm font-semibold text-zinc-900">Letzte Umfragen</p>
              <div className="mt-2 space-y-2">
                {surveyRows.length === 0 ? (
                  <p className="rounded-lg border border-violet-200/70 bg-white/80 px-2.5 py-2 text-xs text-zinc-600">
                    Noch keine Umfragen erstellt.
                  </p>
                ) : (
                  surveyRows.map((survey) => (
                    <div key={survey.id} className="rounded-lg border border-violet-200/70 bg-white/85 px-2.5 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-900">{survey.title}</p>
                        <form action={deleteRewardSurveyAction}>
                          <input type="hidden" name="survey_id" value={survey.id} />
                          <button
                            type="submit"
                            aria-label="Umfrage löschen"
                            title="Umfrage löschen"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-300/70 bg-rose-50 text-sm text-rose-700 transition hover:bg-rose-100"
                          >
                            🗑
                          </button>
                        </form>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Typ: {survey.survey_type === "preset" ? "Vorgegebene Auswahl" : "Freie Vorschläge"}
                        {survey.budget_limit_eur ? ` • Budget: ${survey.budget_limit_eur} €` : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Optionen: {surveyOptionCountBySurvey.get(survey.id) ?? 0} • Antworten: {surveyResponseCountBySurvey.get(survey.id) ?? 0}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <details className="rounded-lg border border-violet-200/70 bg-violet-50/70 p-2">
                          <summary className="cursor-pointer text-[11px] font-semibold text-violet-700 underline decoration-violet-300/70 underline-offset-4">
                            Bearbeiten
                          </summary>
                          <form action={updateRewardSurveyAction} className="mt-2 grid gap-1.5">
                            <input type="hidden" name="survey_id" value={survey.id} />
                            <label className="text-[11px] text-zinc-600">
                              Titel
                              <input
                                name="survey_title"
                                defaultValue={survey.title}
                                className={`${inputClass} mt-1`}
                                required
                              />
                            </label>
                            <label className="text-[11px] text-zinc-600">
                              Beschreibung
                              <textarea
                                name="survey_description"
                                defaultValue={survey.description ?? ""}
                                rows={2}
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                            {survey.survey_type === "open_budget" ? (
                              <label className="text-[11px] text-zinc-600">
                                Budgetlimit in €
                                <input
                                  type="number"
                                  min={1}
                                  name="budget_limit_eur"
                                  defaultValue={String(survey.budget_limit_eur ?? "")}
                                  className={`${inputClass} mt-1`}
                                />
                              </label>
                            ) : null}
                            <label className="text-[11px] text-zinc-600">
                              Enddatum
                              <input
                                type="datetime-local"
                                name="survey_ends_at"
                                defaultValue={
                                  survey.ends_at
                                    ? new Date(survey.ends_at).toISOString().slice(0, 16)
                                    : ""
                                }
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
                              <input
                                type="checkbox"
                                name="is_active"
                                value="1"
                                defaultChecked={survey.is_active}
                              />
                              Aktiv
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              <button type="submit" className={primaryButtonClass}>
                                Umfrage speichern
                              </button>
                            </div>
                          </form>
                        </details>

                        <details className="rounded-lg border border-violet-200/70 bg-violet-50/70 p-2">
                          <summary className="cursor-pointer text-[11px] font-semibold text-violet-700 underline decoration-violet-300/70 underline-offset-4">
                            Antworten ansehen
                          </summary>
                          <div className="mt-2 rounded-lg border border-violet-200/70 bg-white/80 p-2">
                            {survey.survey_type === "preset" ? (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                                  Abstimmung je Option
                                </p>
                                {(surveyOptionsBySurvey.get(survey.id) ?? []).length === 0 ? (
                                  <p className="text-[11px] text-zinc-600">Keine Optionen vorhanden.</p>
                                ) : (
                                  (surveyOptionsBySurvey.get(survey.id) ?? []).map((option) => (
                                    <div
                                      key={option.id}
                                      className="flex items-center justify-between rounded-md border border-violet-200/60 bg-violet-50/70 px-2 py-1.5"
                                    >
                                      <span className="text-[11px] text-zinc-800">{option.text}</span>
                                      <span className="rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                                        {surveyVoteCountByOptionId.get(option.id) ?? 0}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : null}

                            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                              {(surveyResponsesBySurvey.get(survey.id) ?? []).filter((row) => Boolean(row.note)).length === 0 ? (
                                <p className="text-[11px] text-zinc-600">
                                  Noch keine Notizen.
                                </p>
                              ) : (
                                (surveyResponsesBySurvey.get(survey.id) ?? [])
                                  .filter((row) => Boolean(row.note))
                                  .map((response) => (
                                    <div
                                      key={response.id}
                                      className="rounded-md border border-violet-200/60 bg-violet-50/70 px-2 py-1.5"
                                    >
                                      <p className="text-[11px] font-semibold text-zinc-900">
                                        {response.referrerName}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-zinc-700">
                                        {response.note}
                                      </p>
                                      <p className="mt-0.5 text-[10px] text-zinc-500">
                                        {response.createdAt
                                          ? new Date(response.createdAt).toLocaleString("de-DE")
                                          : ""}
                                      </p>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </SurveyOverviewTrigger>
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
      {params.survey_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämien-Umfrage wurde gestartet.
        </p>
      ) : null}
      {params.survey_saved === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Umfrage konnte nicht erstellt werden.
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
            <GiftIcon className="h-4 w-4" />
          </span>
          Neue Prämie anlegen
        </h2>
        <p className="mt-1 text-xs text-zinc-600">Kompakt anlegen und optional direkt ein Bild hochladen.</p>
        <div className="mt-3 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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

          <form action={uploadRewardImageAction} className="grid h-fit gap-2 rounded-xl border border-violet-200/70 bg-violet-50/70 p-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <BookIcon className="h-4 w-4 text-violet-700" />
              Bild-Upload
            </p>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Bilddatei
              <input required type="file" name="image_file" accept="image/*" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Quelle/Lizenz zum Bild (optional)
              <input
                name="image_source_note"
                defaultValue={params.f_image_source_note ?? ""}
                placeholder="z. B. eigenes Foto, Adobe Stock"
                className={inputClass}
              />
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-2.5 text-xs text-zinc-700">
              <input type="checkbox" name="image_rights_confirmed" value="1" defaultChecked={params.f_image_rights_confirmed === "1"} className="mt-0.5" />
              <span>Ich bestätige die Nutzungsrechte für dieses Bild.</span>
            </label>
            <button type="submit" className={primaryButtonClass}>Bild hochladen und URL übernehmen</button>
          </form>
        </div>
      </section>

      <section className="relative z-10">
        <article className={`${panelClass} py-3`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
                  <GiftIcon className="h-4 w-4" />
                </span>
                Bestehende Prämien
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                Übersicht Ihrer angelegten Belohnungen. Bearbeitung erfolgt über das Stift-Symbol.
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
          <div className="mt-3">
            {rewards.length === 0 ? (
              <p className="rounded-xl border border-violet-200/70 bg-white/78 px-3 py-3 text-sm text-zinc-600">
                Noch keine Prämien hinterlegt.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleRewards.map((reward) => (
                  <article key={reward.id} className="rounded-xl border border-violet-200/70 bg-white/78 p-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      {reward.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reward.image_url} alt={reward.title || reward.name || "Prämie"} className="h-12 w-12 rounded-lg object-cover" style={{ objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%` }} />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-violet-200/70 bg-violet-50 text-[9px] text-zinc-500">Kein Bild</div>
                      )}
                      <div>
                        <p className="text-[15px] font-medium leading-tight text-zinc-900">{reward.title || reward.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                            {reward.points_cost} Punkte
                          </span>
                          <span className={reward.is_active ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700" : "rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700"}>
                            {reward.is_active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                        {reward.external_product_url ? (
                          <a href={reward.external_product_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex text-[11px] text-violet-700 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-900">Produktlink öffnen</a>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-zinc-500">Kein Produktlink hinterlegt</p>
                        )}
                      </div>
                    </div>
                    <RewardEditModal
                      reward={reward}
                      inputClass={inputClass}
                      primaryButtonClass={primaryButtonClass}
                      subtleButtonClass={subtleButtonClass}
                      hintClass={hintClass}
                      saveRewardAction={saveRewardAction}
                      deleteRewardAction={deleteRewardAction}
                    />
                  </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>
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
    </main>
  );
}



