export function translateAuthError(error: unknown): string {
  const raw = extractMessage(error).trim();
  if (!raw) return "認証に失敗しました。入力内容をご確認ください。";
  if (/[ぁ-んァ-ン一-龯]/.test(raw)) return raw;

  const lower = raw.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/invalid login credentials|invalid_credentials/, "パスワードが違います"],
    [
      /invalid.*(email|credentials|login)/,
      "メールアドレスまたはパスワードが正しくありません",
    ],
    [
      /user already registered|already registered|already been registered|user_already_exists|identity_already_exists/,
      "このメールアドレスは既に登録されています",
    ],
    [
      /password should be at least|password is too short|at least 6 character|weak_password/,
      "パスワードは6文字以上で入力してください",
    ],
    [
      /email not confirmed|email_not_confirmed|not confirmed/,
      "メールアドレスの確認が完了していません。確認メール内のリンクをクリックしてください。",
    ],
    [
      /unable to validate email|invalid email|email address.*invalid|validation_failed/,
      "メールアドレスの形式を確認してください。",
    ],
    [/signup is disabled|signup_disabled/, "現在、新規登録を受け付けていません。"],
    [
      /email rate limit|rate limit|over_email_send_rate_limit|over_request_rate_limit/,
      "メールの送信上限に達しました。しばらくしてから再度お試しください。",
    ],
    [
      /for security purposes/,
      "短時間に同じ操作が繰り返されました。しばらくしてから再度お試しください。",
    ],
    [
      /same password|should be different from the old password/,
      "新しいパスワードは、現在のパスワードと別のものを設定してください。",
    ],
    [
      /session not found|invalid session|auth session missing/,
      "セッションの有効期限が切れています。もう一度ログインしてください。",
    ],
    [
      /email link is invalid|token has expired|otp_expired|expired/,
      "リンクの有効期限が切れています。もう一度お試しください。",
    ],
    [/access denied|unauthorized/, "認証に失敗しました。もう一度お試しください。"],
    [/user not found/, "このメールアドレスのアカウントが見つかりません。"],
    [
      /network|fetch failed|failed to fetch/,
      "通信に失敗しました。しばらくしてから再度お試しください。",
    ],
    [/failed to send|could not send|email.*fail|resend/, "認証メールの送信に失敗しました"],
  ];

  for (const [pattern, ja] of rules) {
    if (pattern.test(lower)) return ja;
  }
  return "認証に失敗しました。入力内容をご確認ください。";
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${error.message} ${code}` : error.message;
  }
  if (typeof error === "object") {
    const rec = error as {
      message?: unknown;
      error_description?: unknown;
      msg?: unknown;
      code?: unknown;
    };
    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.error_description === "string") return rec.error_description;
    if (typeof rec.msg === "string") return rec.msg;
    if (typeof rec.code === "string") return rec.code;
  }
  return "";
}

export function rawErrorMessage(error: unknown): string {
  const extracted = extractMessage(error).trim();
  if (extracted) return extracted;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return error ? String(error) : "unknown error";
}
