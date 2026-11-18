"use client";

import { useState } from "react";
import Image from "next/image";
import { FiGithub, FiChevronLeft, FiChevronRight, FiExternalLink } from "react-icons/fi";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/translations";

const projectImages = [
  ["/images/2.jpeg", "/images/11.jpeg", "/images/12.jpeg"],
  ["/images/test.jpeg", "/images/test2.jpeg", "/images/test3.jpeg", "/images/test4.jpeg", "/images/test5.jpeg"],
  ["/images/eltahfidh.png", "/images/ecommerce.png", "/images/restaurant.png", "/images/portfolio.png", "/images/study-case/ecommerce-daging.png", "/images/study-case/talenta.png", "/images/study-case/aes/dashboard.png", "/images/study-case/aes/login.png", "/images/study-case/ahp-decision-support.png", "/images/study-case/saw-decision-support.png", "/images/study-case/inventory-pos.png"],
];

const imageFit = {
  "/images/12.jpeg": "object-contain",
};
const fitFor = (src) => {
  return imageFit[src] ?? "object-cover";
};

const projectTags = [
  ["Hardware", "Software", "Network", "Maintenance"],
  ["Arduino", "ESP32", "MQTT", "Sensors"],
  ["React", "Next.js", "Tailwind CSS", "Responsive", "PHP", "MySQL", "CodeIgniter 3", "AES-128", "AHP / SAW", "Inventory"],
];

const projectCategories = ["IT Support", "IoT", "Web Development"];

const Projects = () => {
  const [activeImage, setActiveImage] = useState({});
  const [filterIndex, setFilterIndex] = useState(0);
  const { lang } = useLanguage();
  const t = translations[lang].projects;

  const enCategories = ["All", "Web Development", "IT Support", "IoT"];

  const allProjects = t.items.map((item, i) => ({
    ...item,
    id: i + 1,
    images: projectImages[i],
    tags: projectTags[i],
    category: projectCategories[i],
  }));

  const visible =
    filterIndex === 0
      ? allProjects
      : allProjects.filter((_, i) => projectCategories[i] === enCategories[filterIndex]);

  const step = (project, dir) => {
    const cur = activeImage[project.id] || 0;
    const len = project.images.length;
    setActiveImage((prev) => ({
      ...prev,
      [project.id]: (cur + dir + len) % len,
    }));
  };

  return (
    <section id="projects" className="relative z-10 py-24 md:py-32">
      <div className="shell">
        <div className="border-t border-border pt-6">
          <p className="eyebrow">
            <span className="eyebrow-index">03</span> — {t.categoryLabel || "Projects"}
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.1] text-text">
              {t.title} <span className="text-accent">{t.titleHighlight}</span>
            </h2>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-text-muted">
              {t.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter kategori proyek">
            {t.categories.map((category, index) => {
              const active = filterIndex === index;
              return (
                <button
                  key={category}
                  onClick={() => setFilterIndex(index)}
                  aria-pressed={active}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-text bg-text text-bg"
                      : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => {
            const current = activeImage[project.id] || 0;
            return (
              <article key={project.id} className="card card-hover group flex flex-col overflow-hidden">
                {/* Image */}
                <div className="relative aspect-[16/11] overflow-hidden border-b border-border bg-bg">
                  <Image
                    src={project.images[current]}
                    alt={`${project.title} — tangkapan layar ${current + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className={`${fitFor(project.images[current])} transition-opacity duration-300`}
                  />

                  <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-text backdrop-blur">
                    {project.category}
                  </span>

                  {project.images.length > 1 && (
                    <>
                      <button
                        onClick={() => step(project, -1)}
                        aria-label="Gambar sebelumnya"
                        className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/90 text-text opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <FiChevronLeft size={15} />
                      </button>
                      <button
                        onClick={() => step(project, 1)}
                        aria-label="Gambar berikutnya"
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/90 text-text opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <FiChevronRight size={15} />
                      </button>
                      <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {project.images.map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${
                              current === i ? "w-4 bg-accent" : "w-1.5 bg-text/25"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[0.9375rem] font-semibold leading-snug text-text">
                    {project.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
                    {project.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {(project.demoLinks || []).map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                        >
                          <FiExternalLink size={13} />
                          {link.label}
                        </a>
                      ))}
                      {!project.demoLinks && project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                        >
                          <FiExternalLink size={13} />
                          {project.demoLabel || t.liveDemo}
                        </a>
                      )}
                    </div>
                    <a
                      href={`https://github.com/syncid/${project.title.toLowerCase().replace(/\s+/g, "-")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Lihat ${project.title} di GitHub`}
                      className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text"
                    >
                      <FiGithub size={14} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href="https://github.com/syncid"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            <FiGithub size={16} />
            {t.viewMore}
          </a>
        </div>
      </div>
    </section>
  );
};

export default Projects;
