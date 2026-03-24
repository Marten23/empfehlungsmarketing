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
      `Möchten Sie wirklich ${pointsCost} Punkte ausgeben, um "${rewardTitle}" einzulösen?`,
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
        className="rounded-lg border border-orange-300/45 bg-orange-600 px-3 py-1.5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(91,61,200,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_16px_28px_rgba(91,61,200,0.36)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prämie einlösen
      </button>
    </form>
  );
}
