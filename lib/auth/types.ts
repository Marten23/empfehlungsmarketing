export type AppRole = "advisor" | "referrer";

export type AuthResult = {
  error: string | null;
  message: string | null;
};

export type CurrentUserResult = {
  user: {
    id: string;
    email: string | null;
  } | null;
  role: AppRole | null;
};

