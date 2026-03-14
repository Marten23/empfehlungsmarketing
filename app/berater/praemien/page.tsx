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
  const showAllRewards = params.show === "all";
  const visibleRewards = showAllRewards ? rewards : rewards.slice(0, 10);
  const hasMoreRewards = rewards.length > 10;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Praemienverwaltung</h1>
        <p className="text-sm text-zinc-600">
          Verwalten Sie Ihre Belohnungen fuer Empfehler und behalten Sie Einloesungen
          im Blick.
        </p>
        <Link href="/berater/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700">
          Offene Einloesungen (Benachrichtigung):{" "}
          <span className="font-semibold text-zinc-900">{openCount}</span>
        </p>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Hinweis zu Bildrechten</p>
        <p className="mt-1 text-sm text-amber-900/90">
          Laden Sie nur Bilder hoch bzw. verlinken Sie nur Bilder, fuer die Sie
          nachweislich Nutzungsrechte besitzen (eigene Bilder, Lizenz, Herstellerfreigabe).
          Bei Verstoessen koennen Inhalte entfernt werden.
        </p>
      </section>

      {params.saved === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Praemie gespeichert.
        </p>
      ) : null}
      {params.saved === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Praemie konnte nicht gespeichert werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.updated === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Einloesungsstatus gespeichert.
        </p>
      ) : null}
      {params.updated === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Einloesungsstatus konnte nicht gespeichert werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.deleted === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Praemie geloescht.
        </p>
      ) : null}
      {params.deleted === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Praemie konnte nicht geloescht werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.upload === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Bild erfolgreich hochgeladen.
        </p>
      ) : null}
      {params.upload === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Bild-Upload fehlgeschlagen.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {params.image_removed === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Bild wurde entfernt.
        </p>
      ) : null}
      {params.image_removed === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Bild konnte nicht entfernt werden.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Daten konnten nicht geladen werden: {loadError}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          Bild vom Geraet hochladen
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          So erhalten Sie automatisch eine gueltige Bild-URL aus Supabase Storage.
        </p>
        <form action={uploadRewardImageAction} className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Bilddatei
            <input
              required
              type="file"
              name="image_file"
              accept="image/*"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Quelle/Lizenz zum Bild (optional)
            <input
              name="image_source_note"
              defaultValue={params.f_image_source_note ?? ""}
              placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="md:col-span-2 flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <input
              type="checkbox"
              name="image_rights_confirmed"
              value="1"
              defaultChecked={params.f_image_rights_confirmed === "1"}
              className="mt-0.5"
            />
            <span>
              Ich bestaetige, dass ich fuer dieses Bild die erforderlichen
              Nutzungsrechte habe.
            </span>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Bild hochladen und URL uebernehmen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Neue Praemie anlegen</h2>
        <form action={saveRewardAction} className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Titel
            <input
              required
              name="title"
              defaultValue={params.f_title ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Punktewert
            <input
              required
              type="number"
              min={1}
              name="points_cost"
              defaultValue={params.f_points_cost ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Beschreibung
            <textarea
              name="description"
              rows={1}
              defaultValue={params.f_description ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
            Motivationstext fuer Empfehler
            <textarea
              name="motivation_text"
              rows={1}
              defaultValue={params.f_motivation_text ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Bild-URL (optional)
            <input
              name="image_url"
              defaultValue={params.f_image_url ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          {params.f_image_url ? (
            <div className="md:col-span-2">
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
              <input
                type="hidden"
                name="image_focus_x"
                value={params.f_image_focus_x ?? "50"}
              />
              <input
                type="hidden"
                name="image_focus_y"
                value={params.f_image_focus_y ?? "50"}
              />
            </>
          )}
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Quelle/Lizenz zum Bild (optional)
            <input
              name="image_source_note"
              defaultValue={params.f_image_source_note ?? ""}
              placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Externer Produktlink (optional)
            <input
              name="external_product_url"
              defaultValue={params.f_external_product_url ?? ""}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            />
          </label>
          <label className="md:col-span-2 flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <input
              type="checkbox"
              name="image_rights_confirmed"
              value="1"
              defaultChecked={params.f_image_rights_confirmed === "1"}
              className="mt-0.5"
            />
            <span>
              Ich bestaetige, dass ich fuer verlinkte/hochgeladene Bilder die
              erforderlichen Nutzungsrechte habe. Ohne diese Bestaetigung kann eine
              Praemie mit Bild nicht gespeichert werden.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Status
            <select
              name="is_active"
              defaultValue={params.f_is_active ?? "1"}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              <option value="1">aktiv</option>
              <option value="0">inaktiv</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Praemie speichern
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Bestehende Praemien</h2>
          {hasMoreRewards ? (
            <Link
              href={
                showAllRewards
                  ? "/berater/praemien"
                  : "/berater/praemien?show=all"
              }
              className="text-sm text-zinc-800 underline"
            >
              {showAllRewards ? "Weniger anzeigen" : `Mehr anzeigen (${rewards.length})`}
            </Link>
          ) : null}
        </div>
        {rewards.length === 0 ? (
          <article className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            Noch keine Praemien hinterlegt.
          </article>
        ) : (
          visibleRewards.map((reward) => (
            <article key={reward.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  {reward.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reward.image_url}
                      alt={reward.title || reward.name || "Praemie"}
                      className="h-16 w-16 rounded object-cover"
                      style={{
                        objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%`,
                      }}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500">
                      Kein Bild
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {reward.title || reward.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Punktewert: {reward.points_cost}
                    </p>
                    <p className="mt-1">
                      <span
                        className={
                          reward.is_active
                            ? "rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                            : "rounded bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700"
                        }
                      >
                        {reward.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </p>
                    {reward.external_product_url ? (
                      <a
                        href={reward.external_product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-800 underline"
                      >
                        Produktlink oeffnen
                      </a>
                    ) : (
                      <p className="text-xs text-zinc-500">Kein Produktlink hinterlegt</p>
                    )}
                  </div>
                </div>
                <details className="w-full md:w-auto">
                  <summary className="cursor-pointer rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800">
                    Bearbeiten
                  </summary>
                  <div className="mt-3">
                    <form action={saveRewardAction} className="grid gap-2 md:grid-cols-2">
                      <input type="hidden" name="id" value={reward.id} />
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Titel
                        <input
                          required
                          name="title"
                          defaultValue={reward.title || reward.name || ""}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Punktewert
                        <input
                          required
                          type="number"
                          min={1}
                          name="points_cost"
                          defaultValue={reward.points_cost}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                        Beschreibung
                        <textarea
                          name="description"
                          rows={1}
                          defaultValue={reward.description ?? ""}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                        Motivationstext fuer Empfehler
                        <textarea
                          name="motivation_text"
                          rows={1}
                          defaultValue={reward.motivation_text ?? ""}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Bild-URL
                        <input
                          name="image_url"
                          defaultValue={reward.image_url ?? ""}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      {reward.image_url ? (
                        <div className="md:col-span-2">
                          <ImageFocusPicker
                            imageUrl={reward.image_url}
                            initialX={reward.image_focus_x ?? 50}
                            initialY={reward.image_focus_y ?? 50}
                            inputNameX="image_focus_x"
                            inputNameY="image_focus_y"
                          />
                        </div>
                      ) : (
                        <>
                          <input
                            type="hidden"
                            name="image_focus_x"
                            value={String(reward.image_focus_x ?? 50)}
                          />
                          <input
                            type="hidden"
                            name="image_focus_y"
                            value={String(reward.image_focus_y ?? 50)}
                          />
                        </>
                      )}
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Quelle/Lizenz zum Bild
                        <input
                          name="image_source_note"
                          defaultValue={reward.image_source_note ?? ""}
                          placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Externer Produktlink
                        <input
                          name="external_product_url"
                          defaultValue={reward.external_product_url ?? ""}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="md:col-span-2 flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                        <input
                          type="checkbox"
                          name="image_rights_confirmed"
                          value="1"
                          defaultChecked={reward.image_rights_confirmed}
                          className="mt-0.5"
                        />
                        <span>
                          Ich bestaetige die Nutzungsrechte fuer das verknuepfte Bild.
                          {reward.image_rights_confirmed_at ? (
                            <span className="ml-1 text-zinc-500">
                              (zuletzt bestaetigt am{" "}
                              {new Date(reward.image_rights_confirmed_at).toLocaleString(
                                "de-DE",
                              )}
                              )
                            </span>
                          ) : null}
                        </span>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600">
                        Status
                        <select
                          name="is_active"
                          defaultValue={reward.is_active ? "1" : "0"}
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        >
                          <option value="1">aktiv</option>
                          <option value="0">inaktiv</option>
                        </select>
                      </label>
                      <div className="md:col-span-2 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                        >
                          Aenderungen speichern
                        </button>
                        <button
                          type="submit"
                          formAction={deleteRewardAction}
                          className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
                        >
                          Praemie loeschen
                        </button>
                      </div>
                    </form>
                    <form
                      action={uploadRewardImageAction}
                      className="mt-3 grid gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-2"
                    >
                        <input type="hidden" name="reward_id" value={reward.id} />
                        <input
                          type="hidden"
                          name="image_focus_x"
                          value={String(reward.image_focus_x ?? 50)}
                        />
                        <input
                          type="hidden"
                          name="image_focus_y"
                          value={String(reward.image_focus_y ?? 50)}
                        />
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                        Bild fuer diese Praemie hochladen
                        <input
                          required
                          type="file"
                          name="image_file"
                          accept="image/*"
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                        Quelle/Lizenz zum Bild (optional)
                        <input
                          name="image_source_note"
                          defaultValue={reward.image_source_note ?? ""}
                          placeholder="z. B. eigenes Foto, Adobe Stock, Herstellerfreigabe"
                          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
                        />
                      </label>
                      <label className="md:col-span-2 flex items-start gap-2 text-xs text-zinc-700">
                        <input
                          type="checkbox"
                          name="image_rights_confirmed"
                          value="1"
                          className="mt-0.5"
                        />
                        <span>Ich bestaetige die Nutzungsrechte fuer dieses Bild.</span>
                      </label>
                      <div className="md:col-span-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900"
                          >
                            Bild hochladen
                          </button>
                          {reward.image_url ? (
                            <button
                              type="submit"
                              formAction={removeRewardImageAction}
                              className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700"
                            >
                              Bild entfernen
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </form>
                  </div>
                </details>
              </div>
              {(reward.image_url || reward.external_product_url) ? (
                <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-700">
                    Link- und Bildpruefung
                  </p>
                  {reward.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reward.image_url}
                      alt={reward.title || reward.name || "Praemie"}
                      className="mt-2 h-40 w-full max-w-md rounded object-cover"
                      style={{
                        objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%`,
                      }}
                    />
                  ) : (
                    <p className="mt-2 text-xs text-zinc-600">
                      Keine Bild-URL hinterlegt.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {reward.image_url ? (
                      <a
                        href={reward.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-800 underline"
                      >
                        Bild-URL in neuem Tab pruefen
                      </a>
                    ) : null}
                    {reward.external_product_url ? (
                      <a
                        href={reward.external_product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-800 underline"
                      >
                        Produktlink in neuem Tab pruefen
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Einloesungen</h2>
        <p className="mt-1 text-sm text-zinc-600">
          In-App-Benachrichtigung fuer Bestellungen: Alle offenen Einloesungen sind
          hier sichtbar.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Empfehler</th>
                <th className="px-2 py-2">Praemie</th>
                <th className="px-2 py-2">Punkte</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-zinc-500">
                    Noch keine Einloesungen vorhanden.
                  </td>
                </tr>
              ) : (
                redemptions.map((row) => {
                  const referrerName = row.referrer
                    ? `${row.referrer.first_name} ${row.referrer.last_name}`.trim()
                    : "-";
                  const rewardName =
                    row.reward?.title || row.reward?.name || "Unbekannte Praemie";
                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-2 text-zinc-700">
                        {new Date(row.created_at).toLocaleString("de-DE")}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {referrerName}
                        {row.referrer?.email ? (
                          <span className="ml-1 text-xs text-zinc-500">
                            ({row.referrer.email})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">{rewardName}</td>
                      <td className="px-2 py-2 text-zinc-700">
                        -{row.requested_points_cost}
                      </td>
                      <td className="px-2 py-2">
                        <form action={updateRedemptionStatusAction} className="flex gap-2">
                          <input type="hidden" name="redemption_id" value={row.id} />
                          <select
                            name="status"
                            defaultValue={row.status}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                          >
                            {redemptionStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                          >
                            Speichern
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
