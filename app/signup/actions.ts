"use server";

import { signup } from "@/lib/auth/auth";
import type { AuthResult } from "@/lib/auth/types";

export async function signupAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  return signup(formData);
}

