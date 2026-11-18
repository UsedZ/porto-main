"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

const About = dynamic(() => import("@/components/About"), {
  loading: () => <div className="min-h-[40vh] bg-bg" />,
});
const Skills = dynamic(() => import("@/components/Skills"), {
  loading: () => <div className="min-h-[40vh] bg-surface" />,
});
const Projects = dynamic(() => import("@/components/Projects"), {
  loading: () => <div className="min-h-[40vh] bg-bg" />,
});
const Contact = dynamic(() => import("@/components/Contact"), {
  loading: () => <div className="min-h-[40vh] bg-bg" />,
});
const Footer = dynamic(() => import("@/components/Footer"), {
  loading: () => <div className="h-64 bg-surface" />,
});

export default function Home() {
  return (
    <main className="bg-bg text-text">
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Contact />
      <Footer />
    </main>
  );
}
