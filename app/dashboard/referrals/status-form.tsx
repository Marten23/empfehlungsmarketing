"use client";

import type { FormEvent } from "react";
import type { ReferralStatus } from "@/lib/types/domain";
import { updateReferralStatusAction } from "@/app/dashboard/referrals/actions";

const statuses: ReferralStatus[] = [
  "neu",
  "kontaktiert",
  "termin",
  "abschluss",
  "abgelehnt",
];

const statusLabels: Record<ReferralStatus, string> = {
  neu: "neu",
  kontaktiert: "kontaktiert",
  termin: "termin",
  abschluss: "abschluss",
  abgelehnt: "abgelehnt",
};

type ReferralStatusFormProps = {
  referralId: string;
  currentStatus: ReferralStatus;
};

export function ReferralStatusForm({
  referralId,
  currentStatus,
}: ReferralStatusFormProps) {
  const isLocked = currentStatus === "abschluss";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isLocked) {
      event.preventDefault();
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextStatus = String(formData.get("status") ?? "") as ReferralStatus;
    if (nextStatus !== "abschluss") return;

    const confirmed = window.confirm(
      "Möchten Sie den Status wirklich auf 'abschluss' setzen? Dieser Status ist danach gesperrt.",
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={updateReferralStatusAction}
      className="flex items-center gap-2"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="referral_id" value={referralId} />
      <select
        name="status"
        defaultValue={currentStatus}
        disabled={isLocked}
        className="rounded-lg border border-violet-300/55 bg-white px-2 py-1 text-sm text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 hover:border-violet-400/65 hover:bg-violet-50/70 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLocked}
        className="rounded-lg border border-violet-300/50 bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-[0_10px_18px_rgba(76,29,149,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLocked ? "Final" : "Speichern"}
      </button>
    </form>
  );
}
