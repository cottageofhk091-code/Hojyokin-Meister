export type ChatMessage = { role: "user" | "assistant"; content: string };

export const CHAT_HISTORY_KEY = "ai_meister_chat_history";

export const CHAT_WELCOME =
  "申請書が完成しました！地域独自の補助金や修正したい点について、ここで何でも質問してください";

export function initialChatMessages(): ChatMessage[] {
  return [{ role: "assistant", content: CHAT_WELCOME }];
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const role = (value as { role?: unknown }).role;
  const content = (value as { content?: unknown }).content;
  return (
    (role === "user" || role === "assistant") &&
    typeof content === "string" &&
    content.trim().length > 0
  );
}

function parseMessages(raw: string): ChatMessage[] | null {
  const parsed = JSON.parse(raw) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { messages?: unknown }).messages)
      ? (parsed as { messages: unknown[] }).messages
      : null;
  if (!list) return null;
  const messages = list.filter(isChatMessage).slice(-80);
  return messages.length > 0 ? messages : null;
}

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return initialChatMessages();
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return initialChatMessages();
    return parseMessages(raw) ?? initialChatMessages();
  } catch {
    return initialChatMessages();
  }
}

export function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  const hasUser = messages.some((item) => item.role === "user");
  if (!hasUser) {
    window.localStorage.removeItem(CHAT_HISTORY_KEY);
    return;
  }
  window.localStorage.setItem(
    CHAT_HISTORY_KEY,
    JSON.stringify({ messages, updatedAt: new Date().toISOString() }),
  );
}

export function clearChatHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHAT_HISTORY_KEY);
}
