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
      "Moechten Sie den Status wirklich auf 'abschluss' setzen? Dieser Status ist danach gesperrt.",
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
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLocked}
        className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLocked ? "Final" : "Speichern"}
      </button>
    </form>
  );
}
