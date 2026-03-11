"use server";

import { logout } from "@/lib/auth/auth";

export async function logoutAction() {
  await logout();
}

