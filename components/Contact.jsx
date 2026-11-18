"use client";

import { FiMail, FiMapPin, FiPhone, FiArrowUpRight } from "react-icons/fi"
import { FaWhatsapp, FaInstagram, FaGithub, FaLinkedin } from "react-icons/fa"
import { useLanguage } from "@/context/LanguageContext"
import translations from "@/translations"
import Reveal from "@/components/ui/Reveal"
import AIChat from "@/components/AIChat"

const Contact = () => {
	const { lang } = useLanguage();
	const t = translations[lang].contact;

	const contactInfo = [
		{
			icon: FiMail,
			title: "Email",
			value: "sahroel.ramlan@gmail.com",
			link: "mailto:sahroel.ramlan@gmail.com",
		},
		{
			icon: FaWhatsapp,
			title: "WhatsApp",
			value: "0812-9244-7465",
			link: "https://wa.me/6281292447465",
		},
		{
			icon: FiPhone,
			title: "Phone",
			value: "0812-9244-7465",
			link: null,
		},
		{
			icon: FiMapPin,
			title: "Location",
			value: "Jakarta, Indonesia",
			link: null,
		},
	];

	const socialLinks = [
		{ name: "WhatsApp", icon: FaWhatsapp, link: "https://wa.me/6281292447465" },
		{ name: "Instagram", icon: FaInstagram, link: "https://www.instagram.com/syhl.id/" },
		{ name: "GitHub", icon: FaGithub, link: "https://github.com/syncid" },
		{ name: "LinkedIn", icon: FaLinkedin, link: "https://www.linkedin.com/in/syahrul-ramlan-39a71231b/?locale=en" },
	];

	return (
		<>
			<section id="contact" className="relative z-10 pb-24 md:pb-32">
				<div className="shell">
					<Reveal stagger={0}>
						<div className="border-t border-border pt-6">
							<p className="eyebrow">
								<span className="eyebrow-index">04</span> — {t.title}
							</p>
						</div>
					</Reveal>

					<Reveal stagger={1}>
						<div
							className="mt-10 overflow-hidden rounded-3xl px-6 py-12 md:px-12 md:py-16"
							style={{ backgroundColor: "#14140f" }}
						>
						<div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
							<div className="lg:col-span-7">
								<h2 className="display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] text-white">
									{t.heading}
								</h2>
								<p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-white/65">
									{t.body}
								</p>

								<a
									href="mailto:sahroel.ramlan@gmail.com"
									className="btn mt-8 bg-white text-[#14140f] hover:-translate-y-0.5"
								>
									<FiMail size={16} />
									sahroel.ramlan@gmail.com
									<FiArrowUpRight size={15} />
								</a>

								<div className="mt-10">
									<p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40">
										{t.socialLabel}
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										{socialLinks.map((social) => (
											<a
												key={social.name}
												href={social.link}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={social.name}
												className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
											>
												<social.icon size={16} />
											</a>
										))}
									</div>
								</div>
							</div>

							<div className="lg:col-span-5">
								<ul className="divide-y divide-white/10 rounded-2xl border border-white/12">
									{contactInfo.map((info) => {
										const body = (
											<>
												<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/8 text-white/80">
													<info.icon size={15} />
												</span>
												<span className="min-w-0">
													<span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/40">
														{info.title}
													</span>
													<span className="block break-words text-sm font-medium text-white">
														{info.value}
													</span>
												</span>
											</>
										);

										return (
											<li key={info.title}>
												{info.link ? (
													<a
														href={info.link}
														className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/5"
													>
														{body}
													</a>
												) : (
													<div className="flex items-center gap-3 px-4 py-3.5">{body}</div>
												)}
										</li>
									);
								})}
							</ul>
						</div>
					</div>
					</div>
				</Reveal>
			</div>
		</section>
		<AIChat />
		</>
	);
};

export default Contact;