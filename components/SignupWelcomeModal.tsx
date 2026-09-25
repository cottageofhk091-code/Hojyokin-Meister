"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const TITLE = "🎉🎉🎉 ご登録いただき本当にありがとうございます！ 🎉🎉🎉";
const BODY =
  "メンバーシップへようこそ！感謝の気持ちを込めて、有料のPro機能を【1回無料】でお試しいただける特別チケットをプレゼントいたしました！ぜひその凄さを体感してみてください！";
const BUTTON = "特別チケットを受け取って使ってみる 🚀";

export function SignupWelcomeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const fire = () => {
      void confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 48,
        gravity: 0.9,
        origin: { y: 0.62 },
        zIndex: 90,
        colors: ["#F59E0B", "#D97706", "#FDE68A", "#FFFFFF", "#FB7185", "#34D399"],
      });
      void confetti({
        particleCount: 45,
        angle: 60,
        spread: 58,
        origin: { x: 0, y: 0.7 },
        zIndex: 90,
        colors: ["#F59E0B", "#FDE68A", "#FFFFFF"],
      });
      void confetti({
        particleCount: 45,
        angle: 120,
        spread: 58,
        origin: { x: 1, y: 0.7 },
        zIndex: 90,
        colors: ["#D97706", "#FB7185", "#34D399"],
      });
    };

    fire();
    intervalRef.current = window.setInterval(fire, 900);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      confetti.reset();
    };
  }, [open]);

  if (!open) return null;

  function handleClose() {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    confetti.reset();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-welcome-title"
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0F172A]/65 px-4"
    >
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[28px] border-2 border-[#FDE68A] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#7C2D12] p-7 text-white shadow-[0_28px_80px_rgba(217,119,6,0.45)] sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[#F59E0B]/40 blur-3xl"
        />
        <p className="relative text-center text-[13px] font-extrabold tracking-[0.28em] text-[#FDE68A]">
          WELCOME
        </p>
        <h3
          id="signup-welcome-title"
          className="relative mt-3 text-center text-[26px] font-black leading-tight tracking-tight sm:text-[32px]"
        >
          {TITLE}
        </h3>
        <p className="relative mt-5 text-center text-[16px] font-bold leading-8 text-[#FFF7ED] sm:text-[18px] sm:leading-9">
          {BODY}
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="relative mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FDE68A] px-5 text-[16px] font-black text-[#0F172A] shadow-[0_12px_28px_rgba(245,158,11,0.45)] transition hover:brightness-110"
        >
          {BUTTON}
        </button>
      </div>
    </div>
  );
}
