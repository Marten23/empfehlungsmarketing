"use server";

import { login } from "@/lib/auth/auth";
import type { AuthResult } from "@/lib/auth/types";

export async function loginAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  return login(formData);
}

