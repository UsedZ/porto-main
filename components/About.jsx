"use client";

import { HiCode, HiDesktopComputer, HiSupport, HiServer } from "react-icons/hi";
import { FaTools, FaNetworkWired } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/translations";
import Reveal from "@/components/ui/Reveal";

const About = () => {
  const { lang } = useLanguage();
  const t = translations[lang].about;

  const expertiseIcons = [HiDesktopComputer, HiServer, HiCode];
  const skillIcons = [FaTools, HiServer, FaNetworkWired, HiSupport];

  return (
    <section id="about" className="relative z-10 py-24 md:py-32">
      <div className="shell">
        {/* Section header */}
        <Reveal stagger={0}>
          <div className="border-t border-border pt-6">
            <p className="eyebrow">
              <span className="eyebrow-index">01</span> — {t.title}
            </p>
          </div>
        </Reveal>

        <Reveal stagger={1}>
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <h2 className="display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.1] text-text lg:col-span-6">
              {t.heading}{" "}
              <span className="text-accent">{t.headingHighlight}</span>{" "}
              {lang === "en"
                ? "with a builder's habit."
                : "dengan kebiasaan seorang pembangun."}
            </h2>

            <div className="lg:col-span-6">
              <p className="text-[0.9375rem] leading-relaxed text-text-muted">{t.p1}</p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-muted">{t.p2}</p>
              <a href="#contact" className="btn btn-ghost mt-7">
                {t.cta}
              </a>
            </div>
          </div>
        </Reveal>

        {/* Expertise */}
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {t.expertise.map((item, index) => {
            const Icon = expertiseIcons[index];
            return (
              <Reveal stagger={2 + index} key={item.title}>
                <article key={item.title} className="card card-hover p-6">
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Icon size={20} />
                    </span>
                    <span className="eyebrow-index text-xs font-semibold">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-text">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Capabilities */}
        <Reveal stagger={5}>
          <div className="mt-14 grid gap-6 rounded-2xl border border-border bg-surface px-6 py-6 md:grid-cols-12 md:p-8">
            <div className="md:col-span-4">
              <p className="eyebrow">{t.capabilitiesTitle}</p>
              <h3 className="mt-2 text-lg font-semibold text-text">
                {t.capabilitiesHighlight}
              </h3>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 md:col-span-8">
              {t.skills.map((skill, index) => {
                const Icon = skillIcons[index] || FaTools;
                return (
                  <li
                    key={skill}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3"
                  >
                    <Icon className="shrink-0 text-accent" size={16} />
                    <span className="text-sm font-medium text-text">{skill}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default About;
