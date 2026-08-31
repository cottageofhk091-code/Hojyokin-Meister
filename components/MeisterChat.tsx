"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, FormEvent, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import {
  Crown,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { PremiumLockCard } from "@/components/PremiumLockCard";
import {
  CHAT_WELCOME,
  clearChatHistory,
  initialChatMessages,
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from "@/lib/chat-history";
import type { GenerateResult } from "@/lib/types";

const SUGGESTIONS = [
  "この地域で使える独自の補助金は？",
  "この表現で大丈夫？",
  "経費の書き方で気をつける点は？",
];

const RESET_CONFIRM = "これまでの相談内容を消去してリセットしますか？";

type SizePreset = "compact" | "standard" | "large";

const SIZE_PRESETS: Record<SizePreset, { w: number; h: number }> = {
  compact: { w: 300, h: 400 },
  standard: { w: 400, h: 560 },
  large: { w: 600, h: 700 },
};

const MIN_SIZE = { w: 280, h: 360 };
const WINDOW_MARGIN = 16;

export type ChatContext = {
  location: string;
  industry: string;
  subsidyType: string;
  result: GenerateResult;
};

function viewportLimit() {
  if (typeof window === "undefined") {
    return { w: SIZE_PRESETS.standard.w, h: SIZE_PRESETS.standard.h };
  }
  return {
    w: Math.max(MIN_SIZE.w, window.innerWidth - WINDOW_MARGIN * 2),
    h: Math.max(MIN_SIZE.h, window.innerHeight - WINDOW_MARGIN * 2),
  };
}

function clampSize(w: number, h: number) {
  const max = viewportLimit();
  return {
    w: Math.min(Math.max(Math.round(w), MIN_SIZE.w), max.w),
    h: Math.min(Math.max(Math.round(h), MIN_SIZE.h), max.h),
  };
}

export function MeisterChatDock({
  open,
  onOpenChange,
  unlocked,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlocked: boolean;
  context: ChatContext;
}) {
  const [welcome, setWelcome] = useState(true);
  const [turns, setTurns] = useState<ChatMessage[]>(initialChatMessages);
  const [historyReady, setHistoryReady] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [preset, setPreset] = useState<SizePreset | null>("standard");
  const [size, setSize] = useState(SIZE_PRESETS.standard);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    setTurns(loadChatHistory());
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    saveChatHistory(turns);
  }, [turns, historyReady]);

  useEffect(() => {
    setWelcome(true);
    const id = window.setTimeout(() => setWelcome(false), 12000);
    return () => window.clearTimeout(id);
  }, [context.result.plan.title]);

  useEffect(() => {
    function onViewport() {
      setSize((current) => clampSize(current.w, current.h));
    }
    onViewport();
    window.addEventListener("resize", onViewport);
    return () => window.removeEventListener("resize", onViewport);
  }, [open]);

  function handleResetChat() {
    if (!window.confirm(RESET_CONFIRM)) return;
    clearChatHistory();
    setTurns(initialChatMessages());
    setSessionId((value) => value + 1);
  }

  function applyPreset(next: SizePreset) {
    setPreset(next);
    setSize(clampSize(SIZE_PRESETS[next].w, SIZE_PRESETS[next].h));
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;
    setPreset(null);

    function onMove(move: PointerEvent) {
      if (move.pointerId !== pointerId) return;
      setSize(
        clampSize(startW + (startX - move.clientX), startH + (startY - move.clientY)),
      );
    }

    function onUp(up: PointerEvent) {
      if (up.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <>
      {!open ? (
        <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end">
          <div className="relative flex flex-col items-end">
            {welcome ? (
              <div
                role="status"
                className="chat-welcome pointer-events-auto mb-3 w-[min(calc(100vw-3.5rem),20rem)] rounded-[18px] border border-[#F59E0B]/50 bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-3.5 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#F59E0B]">
                  <Sparkles size={13} />
                  申請書が完成しました！
                </p>
                <p className="mt-1.5 text-[12px] font-medium leading-5 text-white/90 sm:text-[13px] sm:leading-6">
                  地域独自の補助金や修正したい点について、ここで何でも質問してください
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setWelcome(false);
                    onOpenChange(true);
                  }}
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[12px] font-bold text-[#0F172A]"
                >
                  今すぐ相談する
                </button>
              </div>
            ) : null}
            <div className="relative">
              {!welcome ? (
                <button
                  type="button"
                  onClick={() => {
                    setWelcome(false);
                    onOpenChange(true);
                  }}
                  className="chat-speech chat-bubble pointer-events-auto absolute right-0 bottom-full mb-3 w-max max-w-[min(calc(100vw-5.5rem),11.5rem)] rounded-[16px] border border-[#F59E0B]/50 bg-white px-3 py-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.14)] sm:max-w-none sm:px-3.5 sm:py-2.5"
                >
                  <p className="text-[12px] font-bold leading-5 text-brand sm:text-[13px]">
                    💡 AIマイスターに相談
                  </p>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setWelcome(false);
                  onOpenChange(true);
                }}
                className="chat-fab pointer-events-auto relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-[#0F172A] sm:h-[4.25rem] sm:w-[4.25rem]"
                aria-expanded={open}
                aria-label="AIマイスターに相談する"
              >
                <Crown size={26} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="AIマイスターに個別相談"
          className="fixed z-[60] flex flex-col overflow-hidden rounded-[24px] border border-[#F59E0B]/40 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
          style={{
            right: WINDOW_MARGIN,
            bottom: WINDOW_MARGIN,
            width: size.w,
            height: size.h,
            maxWidth: `calc(100vw - ${WINDOW_MARGIN * 2}px)`,
            maxHeight: `calc(100vh - ${WINDOW_MARGIN * 2}px)`,
          }}
        >
          <button
            type="button"
            className="chat-resize-handle absolute top-0 left-0 z-10 h-7 w-7 cursor-nwse-resize touch-none rounded-br-xl"
            aria-label="チャットウィンドウのサイズを変更"
            title="ドラッグしてサイズ変更"
            onPointerDown={startResize}
          >
            <span className="absolute top-1.5 left-1.5 h-3 w-3 border-t-2 border-l-2 border-white/70" />
          </button>
          <ChatChrome
            context={context}
            unlocked={unlocked}
            onClose={() => onOpenChange(false)}
            onReset={handleResetChat}
            turns={turns}
            onTurnsChange={setTurns}
            sessionId={sessionId}
            preset={preset}
            onPreset={applyPreset}
          />
        </div>
      ) : null}
    </>
  );
}

function ChatChrome({
  context,
  unlocked,
  onClose,
  onReset,
  turns,
  onTurnsChange,
  sessionId,
  preset,
  onPreset,
}: {
  context: ChatContext;
  unlocked: boolean;
  onClose: () => void;
  onReset: () => void;
  turns: ChatMessage[];
  onTurnsChange: Dispatch<SetStateAction<ChatMessage[]>>;
  sessionId: number;
  preset: SizePreset | null;
  onPreset: (preset: SizePreset) => void;
}) {
  return (
    <>
      <div className="relative flex shrink-0 flex-col bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white">
        <div className="flex items-start justify-between gap-2 px-4 py-3 pl-7">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-[#0F172A]">
              <Crown size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-[#F59E0B]">
                AI MEISTER
              </p>
              <h2 className="truncate text-[14px] font-bold leading-5">
                AIマイスターに個別相談
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-white/70">
                {context.location || "地域未入力"} / {context.industry || "業種未入力"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="チャットをリセット"
              title="チャットをリセット"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="チャットを閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 pb-2.5">
          <button
            type="button"
            onClick={() => onPreset("compact")}
            className={`inline-flex min-h-7 flex-1 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold ${
              preset === "compact" ? "bg-white text-[#0F172A]" : "bg-white/10 hover:bg-white/15"
            }`}
            aria-pressed={preset === "compact"}
            title="縮小 300×400"
          >
            <Minimize2 size={12} />
            縮小
          </button>
          <button
            type="button"
            onClick={() => onPreset("standard")}
            className={`inline-flex min-h-7 flex-1 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold ${
              preset === "standard" ? "bg-white text-[#0F172A]" : "bg-white/10 hover:bg-white/15"
            }`}
            aria-pressed={preset === "standard"}
            title="標準 400×560"
          >
            <Square size={12} />
            標準
          </button>
          <button
            type="button"
            onClick={() => onPreset("large")}
            className={`inline-flex min-h-7 flex-1 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold ${
              preset === "large" ? "bg-white text-[#0F172A]" : "bg-white/10 hover:bg-white/15"
            }`}
            aria-pressed={preset === "large"}
            title="拡大 600×700"
          >
            <Maximize2 size={12} />
            拡大
          </button>
        </div>
      </div>
      {unlocked ? (
        <ChatPanel
          context={context}
          turns={turns}
          onTurnsChange={onTurnsChange}
          sessionId={sessionId}
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center overflow-y-auto p-5">
          <PremiumLockCard />
        </div>
      )}
    </>
  );
}

function ChatPanel({
  context,
  turns,
  onTurnsChange,
  sessionId,
}: {
  context: ChatContext;
  turns: ChatMessage[];
  onTurnsChange: Dispatch<SetStateAction<ChatMessage[]>>;
  sessionId: number;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  useEffect(() => {
    setLoading(false);
    setError(null);
    setInput("");
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (message.length < 2 || loading) return;
    const started = sessionRef.current;
    const nextTurns: ChatMessage[] = [
      ...turns,
      { role: "user", content: message },
    ];
    onTurnsChange(nextTurns);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: turns.filter((turn) => turn.content !== CHAT_WELCOME),
          context: {
            location: context.location,
            industry: context.industry,
            subsidyType: context.subsidyType,
            plan: context.result.plan,
          },
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (sessionRef.current !== started) return;
      if (!response.ok || !data.reply) {
        throw new Error(data.error || "応答を取得できませんでした。");
      }
      onTurnsChange([
        ...nextTurns,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      if (sessionRef.current !== started) return;
      setError(err instanceof Error ? err.message : "通信に失敗しました。");
    } finally {
      if (sessionRef.current === started) setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-6 ${
              turn.role === "user"
                ? "ml-auto bg-[#0F172A] text-white"
                : "bg-[#f7f1e6] text-foreground"
            }`}
          >
            {turn.content}
          </div>
        ))}
        {turns.length <= 1 ? (
          <div className="space-y-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void send(item)}
                className="block w-full rounded-2xl border border-line bg-[#fbfaf7] px-3 py-2 text-left text-[13px] leading-5 hover:border-accent hover:bg-white"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
        {loading ? <TypingIndicator /> : null}
        <div ref={endRef} />
      </div>

      {error ? (
        <p className="px-5 pb-1 text-[12px] text-[#c41e3a]">{error}</p>
      ) : null}

      {loading ? (
        <p className="px-5 text-[12px] font-medium text-accent">AIが思考中...</p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-3 sm:p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例）朝日町で使える独自の補助金は？"
          className="min-h-11 flex-1 rounded-full border border-line bg-[#fbfaf7] px-4 text-[14px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length < 2}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-[#0F172A] disabled:opacity-50"
          aria-label="送信"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl bg-[#f7f1e6] px-3 py-2"
      aria-live="polite"
      aria-label="AIが思考中"
    >
      <span className="flex items-center gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span className="text-[12px] font-medium text-accent">AIが思考中...</span>
    </div>
  );
}
