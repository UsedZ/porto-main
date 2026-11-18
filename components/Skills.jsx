"use client";

import {
  SiReact, SiNextdotjs, SiTailwindcss, SiJavascript,
  SiTypescript, SiNodedotjs, SiMongodb, SiGit, SiFigma, SiDocker,
} from "react-icons/si";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/translations";
import Reveal from "@/components/ui/Reveal";

const Skills = () => {
  const { lang } = useLanguage();
  const t = translations[lang].skills;

  const techStack = [
    { icon: SiReact, name: "React", color: "#61DAFB" },
    { icon: SiNextdotjs, name: "Next.js", color: "currentColor" },
    { icon: SiTailwindcss, name: "Tailwind", color: "#06B6D4" },
    { icon: SiJavascript, name: "JavaScript", color: "#EAB308" },
    { icon: SiTypescript, name: "TypeScript", color: "#3178C6" },
    { icon: SiNodedotjs, name: "Node.js", color: "#339933" },
    { icon: SiMongodb, name: "MongoDB", color: "#47A248" },
    { icon: SiGit, name: "Git", color: "#F05032" },
    { icon: SiFigma, name: "Figma", color: "#F24E1E" },
    { icon: SiDocker, name: "Docker", color: "#2496ED" },
  ];

  return (
    <section id="skills" className="bg-surface py-24 md:py-32">
      <div className="shell">
        <Reveal stagger={0}>
          <div className="border-t border-border pt-6">
            <p className="eyebrow">
              <span className="eyebrow-index">02</span> — {t.title} {t.titleHighlight}
            </p>
          </div>
        </Reveal>

        <Reveal stagger={1}>
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <h2 className="display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.1] text-text">
                {t.title} <span className="text-accent">{t.titleHighlight}</span>
              </h2>
              <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
                {t.subtitle}
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-5">
              {techStack.map((tech) => (
                <li
                  key={tech.name}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg px-2 py-3.5 transition-colors hover:border-border-strong"
                >
                  <tech.icon
                    size={26}
                    style={{ color: tech.color }}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                  <span className="text-[0.7rem] font-medium text-text-muted">{tech.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal stagger={2}>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-bg px-6 py-6 sm:flex-row sm:items-center">
            <p className="max-w-xl text-sm leading-relaxed text-text-muted">{t.learningText}</p>
            <a href="#projects" className="btn btn-primary shrink-0 !py-2.5 !text-sm">
              {t.seeBuilt}
            </a>
          </div>
        </Reveal>
        </div>
        </section>
        );
};

export default Skills;
