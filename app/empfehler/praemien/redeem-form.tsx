"use client";

import type { FormEvent } from "react";
import { redeemRewardAction } from "@/app/empfehler/praemien/actions";

type RedeemFormProps = {
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  canRedeem: boolean;
};

export function RedeemForm({
  rewardId,
  rewardTitle,
  pointsCost,
  canRedeem,
}: RedeemFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canRedeem) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      `Moechten Sie wirklich ${pointsCost} Punkte ausgeben, um "${rewardTitle}" einzuloesen?`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={redeemRewardAction} onSubmit={handleSubmit}>
      <input type="hidden" name="reward_id" value={rewardId} />
      <button
        type="submit"
        disabled={!canRedeem}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Praemie einloesen
      </button>
    </form>
  );
}
