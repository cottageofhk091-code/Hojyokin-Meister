import { GeneratorForm } from "@/components/GeneratorForm";
import { LogoMark } from "@/components/LogoMark";
import { HERO_SUPPORTS } from "@/lib/site-content";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_280px_at_50%_-40px,rgba(245,158,11,0.22),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-[960px] px-5 py-10 text-center sm:py-14">
          <div className="mb-4 flex items-center justify-center">
            <LogoMark size="lg" />
          </div>
          <h1 className="text-[28px] font-extrabold leading-[1.25] tracking-tight sm:text-[40px] sm:leading-[1.2]">
            {SITE_NAME}
          </h1>
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-[#D97706] to-[#F59E0B]" />
          <p className="mx-auto mt-5 max-w-[22rem] text-[14px] font-medium leading-7 text-white/80 sm:max-w-[38rem] sm:text-[16px] sm:leading-8">
            迷わない、悩まない。
            <br />
            補助金・助成金の申請書作成は、AIマイスターにおまかせ。
          </p>

          <div className="mt-7 sm:mt-8">
            <h2 className="text-[15px] font-extrabold tracking-tight sm:text-[18px]">
              迷わず進める、4つの支援
            </h2>
            <div className="mx-auto mt-4 grid max-w-[34rem] grid-cols-2 gap-2 lg:max-w-none lg:grid-cols-4 lg:gap-3">
              {HERO_SUPPORTS.map((item) => (
                <article
                  key={item.title}
                  className="flex flex-col items-center rounded-[14px] border border-[#F59E0B]/20 bg-white/[0.05] px-2 py-2.5 lg:px-3 lg:py-3"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-[#0F172A] lg:h-8 lg:w-8">
                    <item.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" strokeWidth={2} />
                  </span>
                  <h3 className="mt-1.5 text-center text-[11px] font-semibold leading-4 tracking-tight lg:text-[12px] lg:leading-5">
                    {item.title}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="w-full flex-1 px-5 pb-24 pt-10">
        <GeneratorForm />
      </main>
    </div>
  );
}
