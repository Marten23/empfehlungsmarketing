"use client";

import { useMemo, useState } from "react";
import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type InboxNotification = {
  id: string;
  title: string;
  message: string | null;
  notificationType: "reward_survey" | "info";
  rewardSurveyId: string | null;
  isRead: boolean;
  createdAt: string;
};

type InboxSurveyOption = {
  id: string;
  text: string;
};

type InboxSurvey = {
  id: string;
  title: string;
  description: string | null;
  surveyType: "preset" | "open_budget";
  budgetLimitEur: number | null;
  options: InboxSurveyOption[];
};

type ReferrerInboxProps = {
  notifications: InboxNotification[];
  surveys: InboxSurvey[];
  submitSurveyResponseAction: (formData: FormData) => void | Promise<void>;
  markNotificationReadAction: (formData: FormData) => void | Promise<void>;
  deleteNotificationAction: (formData: FormData) => void | Promise<void>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ReferrerInbox({
  notifications,
  surveys,
  submitSurveyResponseAction,
  markNotificationReadAction,
  deleteNotificationAction,
}: ReferrerInboxProps) {
  const [openNotificationId, setOpenNotificationId] = useState<string | null>(null);
  const openNotification = useMemo(
    () => notifications.find((item) => item.id === openNotificationId) ?? null,
    [notifications, openNotificationId],
  );
  const openSurvey = useMemo(() => {
    if (!openNotification?.rewardSurveyId) return null;
    return surveys.find((survey) => survey.id === openNotification.rewardSurveyId) ?? null;
  }, [surveys, openNotification]);

  return (
    <>
      <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <SparklesIcon className="h-4 w-4" />
            Mitteilungen
          </p>
          <span className="rounded-full border border-violet-300/55 bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            {notifications.length}
          </span>
        </div>

        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-violet-200/70 bg-white/85 px-2.5 py-2 text-xs text-zinc-600">
              Keine neuen Mitteilungen.
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                  item.isRead
                    ? "border-violet-200/65 bg-white/78"
                    : "border-violet-400/80 bg-violet-100/85 ring-1 ring-violet-300/65"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenNotificationId(item.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-zinc-900">{item.title}</p>
                    {!item.isRead ? (
                      <span className="rounded-full border border-violet-400/70 bg-violet-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                        Neu
                      </span>
                    ) : null}
                  </div>
                  {item.message ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{item.message}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-zinc-500">{formatDate(item.createdAt)}</p>
                </button>
                <form action={deleteNotificationAction}>
                  <input type="hidden" name="notification_id" value={item.id} />
                  <button
                    type="submit"
                    title="Mitteilung löschen"
                    aria-label="Mitteilung löschen"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-300/70 bg-rose-50 text-xs text-rose-700 transition hover:bg-rose-100"
                  >
                    🗑
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>

      {openNotification ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/55 p-4"
          onClick={() => setOpenNotificationId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-violet-200/80 bg-white p-4 shadow-[0_24px_48px_rgba(10,6,20,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-zinc-900">{openNotification.title}</p>
                {openNotification.message ? (
                  <p className="mt-1 text-sm text-zinc-600">{openNotification.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpenNotificationId(null)}
                className="rounded-lg border border-violet-300/60 bg-white px-2 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-50"
              >
                Schließen
              </button>
            </div>

            <div className="mt-3">
              {openNotification.notificationType === "reward_survey" && openSurvey ? (
                <form action={submitSurveyResponseAction} className="grid gap-2.5">
                  <input type="hidden" name="notification_id" value={openNotification.id} />
                  <input type="hidden" name="survey_id" value={openSurvey.id} />
                  <input type="hidden" name="survey_type" value={openSurvey.surveyType} />

                  {openSurvey.description ? (
                    <p className="rounded-lg border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-xs text-zinc-700">
                      {openSurvey.description}
                    </p>
                  ) : null}

                  {openSurvey.surveyType === "preset" ? (
                    <div className="grid gap-2">
                      {openSurvey.options.map((option) => (
                        <label key={option.id} className="inline-flex items-center gap-2 rounded-lg border border-violet-200/70 bg-white px-2.5 py-2 text-sm text-zinc-800">
                          <input type="checkbox" name="selected_option_ids" value={option.id} />
                          <span>{option.text}</span>
                        </label>
                      ))}
                      <p className="text-[11px] text-zinc-600">
                        Sie können mehrere Optionen auswählen.
                      </p>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Notiz (optional)
                        <textarea
                          name="response_note"
                          rows={2}
                          className="rounded-xl border border-violet-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                          placeholder="Kurzer Hinweis zu Ihrer Auswahl"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="grid gap-1 text-sm text-zinc-700">
                      Ihr Vorschlag
                      <textarea
                        name="free_suggestion"
                        required
                        rows={3}
                        className="rounded-xl border border-violet-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                        placeholder={
                          openSurvey.budgetLimitEur
                            ? `Wunschprämie bis maximal ${openSurvey.budgetLimitEur} €`
                            : "Welche Prämie wünschen Sie sich?"
                        }
                      />
                    </label>
                  )}

                  <button
                    type="submit"
                    className="mt-1 w-fit rounded-xl border border-violet-300/50 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                  >
                    Antwort absenden
                  </button>
                </form>
              ) : (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notification_id" value={openNotification.id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-violet-300/50 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                  >
                    Als gelesen markieren
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
