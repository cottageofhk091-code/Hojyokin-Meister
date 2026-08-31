import { Crown, FileCheck } from "lucide-react";

const SIZES = {
  sm: { box: "h-9 w-9 rounded-xl", file: 16, crown: 11 },
  md: { box: "h-10 w-10 rounded-[13px]", file: 18, crown: 12 },
  lg: { box: "h-14 w-14 rounded-2xl", file: 24, crown: 15 },
} as const;

export function LogoMark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];

  return (
    <span
      aria-hidden
      className={`relative flex ${s.box} items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] shadow-[0_8px_22px_rgba(217,119,6,0.28)] ring-1 ring-[#F59E0B]/45`}
    >
      <Crown
        className="absolute top-[3px] text-[#F59E0B]"
        size={s.crown}
        strokeWidth={2.1}
      />
      <FileCheck
        className="mt-2.5 text-[#FBBF24]"
        size={s.file}
        strokeWidth={1.9}
      />
    </span>
  );
}
