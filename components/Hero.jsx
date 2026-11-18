"use client";

// Rotating job titles shown in the hero typing animation.
const ROLES = [
  "IT Support Specialist",
  "IoT Specialist",
  "Web Developer",
  "Full Stack Developer",
];

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa";
import { FiArrowDownRight } from "react-icons/fi";
import { useLanguage } from "@/context/LanguageContext.js";
import translations from "@/translations";
import useReducedMotion from "./hero/useReducedMotion";
import Scene3DFallback from "./hero/Scene3DFallback";

// Cinematic 3D scene: three.js murni (lihat components/hero/Scene3D.jsx).
// Dimuat lazy (ssr:false) supaya three hanya masuk chunk klien, dan hanya
// dipasang kalau perangkat benar-benar sanggup WebGL.
const Scene3D = dynamic(() => import("./hero/Scene3D"), { ssr: false, loading: () => null });

const Hero = () => {
  const { lang } = useLanguage();
  const t = translations[lang].hero;

  const reducedMotion = useReducedMotion();
  const hasWebGL = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const probe = document.createElement("canvas");
      return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [tier, setTier] = useState("full");

  useEffect(() => {
    const computeTier = () => {
      const w = window.innerWidth;
      const cores = navigator.hardwareConcurrency || 4;
      if (cores <= 2) return "off"; // perangkat sangat lemah → poster
      if (w < 768) return "light";
      if (w < 1024) return "medium";
      return "full";
    };
    setTier(computeTier());
    const onResize = () => {
      // pindah breakpoint = kesempatan mencoba lagi setelah watchdog menyerah
      setTier(computeTier());
      setSceneFailed(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const show3D = hasWebGL && !reducedMotion && !sceneFailed && tier !== "off";
  const [roleIndex, setRoleIndex] = useState(0);
  const [typed, setTyped] = useState("IT Support Specialist");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = ROLES[roleIndex % ROLES.length];
    const speed = deleting ? 45 : 95;
    const timer = setTimeout(() => {
      if (!deleting && typed === full) {
        setTimeout(() => setDeleting(true), 1800);
        return;
      }
      if (deleting && typed === "") {
        setDeleting(false);
        setRoleIndex((i) => i + 1);
        return;
      }
      setTyped(deleting ? full.slice(0, typed.length - 1) : full.slice(0, typed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [typed, deleting, roleIndex]);

  const socials = [
    { icon: FaGithub, url: "https://github.com/syncid", label: "GitHub" },
    {
      icon: FaLinkedin,
      url: "https://www.linkedin.com/in/syahrul-ramlan-39a71231b/?locale=en",
      label: "LinkedIn",
    },
    { icon: FaInstagram, url: "https://www.instagram.com/syhl.id/", label: "Instagram" },
  ];

  const facts = [
    {
      label: lang === "en" ? "Focus" : "Fokus",
      value: "IT Support · IoT · Web",
    },
    {
      label: lang === "en" ? "Location" : "Lokasi",
      value: "Jakarta, Indonesia",
    },
    {
      label: lang === "en" ? "Status" : "Status",
      value: lang === "en" ? "Open to opportunities" : "Terbuka untuk peluang",
    },
  ];

  const intro =
    lang === "en"
      ? "I keep systems running, wire devices into the network, and build the interfaces that make the data readable."
      : "Saya menjaga sistem tetap berjalan, menghubungkan perangkat ke jaringan, dan membangun antarmuka yang membuat data mudah dibaca.";

  return (
    <section id="home" className="relative overflow-hidden pt-28 md:pt-32">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-bg-cinema" />
      </div>
      {/* Latar sinematik: kanvas three.js (atau poster statis kalau WebGL/reduced-motion/mobile). */}
      {show3D ? <Scene3D tier={tier} onLowPerf={() => setSceneFailed(true)} /> : <Scene3DFallback />}
      <div className="shell relative z-10">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Copy */}
          <div className="lg:col-span-7 min-w-0 relative z-10">
            <div className="rise flex flex-wrap items-center gap-3" style={{ animationDelay: "0.05s" }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {lang === "en" ? "Open to work" : "Terbuka untuk kerja"}
              </span>
              <span className="eyebrow">Portfolio — 2026</span>
            </div>

            <h1 className="display rise mt-7 text-[clamp(3rem,9vw,6.5rem)] text-text" style={{ animationDelay: "0.1s" }}>
              Syahrul
              <br />
              Ramlan
            </h1>

            <div className="rise mt-6 flex h-8 items-center gap-2 text-lg text-text-muted md:text-xl" style={{ animationDelay: "0.16s" }}>
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              <span className="font-medium text-text">{typed}</span>
              <span className="inline-block h-5 w-px animate-pulse bg-accent" aria-hidden="true" />
            </div>

            <p className="rise mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-text-muted md:text-base" style={{ animationDelay: "0.22s" }}>
              {intro}
            </p>

            <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.28s" }}>
              <a href="#projects" className="btn btn-primary group">
                {t.viewWork}
                <FiArrowDownRight className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
              </a>
              <a href="#contact" className="btn btn-ghost">
                {t.contactMe}
              </a>
            </div>

            <div className="rise mt-9 flex items-center gap-2" style={{ animationDelay: "0.34s" }}>
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface text-text transition-colors hover:border-text"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Profile Image */}
          <div className="rise lg:col-span-5 relative z-10" style={{ animationDelay: "0.2s" }} id="hero-photo">
            <div className="relative mx-auto max-w-[22rem] lg:ml-auto lg:mr-0">
              <div className="absolute -inset-3 rounded-[1.75rem] border border-border" aria-hidden="true" />
              <div className="relative w-56 sm:w-64 md:w-72 lg:w-80 mx-auto">
                <div className="relative w-full aspect-[758/1340] overflow-hidden rounded-[1.5rem] border border-border bg-surface">
                  <Image
                    src="/images/profile.jpeg"
                    alt="Foto profil Syahrul Ramlan"
                    fill
                    priority
                    sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, (max-width: 1024px) 288px, 320px"
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-xl border border-border bg-surface px-4 py-3 shadow-soft sm:block">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-text-subtle">
                  Based in
                </p>
                <p className="mt-0.5 text-sm font-semibold text-text">Jakarta, ID</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fact strip */}
        <dl className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="bg-surface px-5 py-4">
              <dt className="eyebrow">{f.label}</dt>
              <dd className="mt-1 text-sm font-medium text-text">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default Hero;