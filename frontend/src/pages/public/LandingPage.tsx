import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Bell,
  Cpu,
  FileCheck,
  Layers,
  MapPin,
  Menu,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { LineReveal } from '@/components/animations/TextReveal';
import { ImageReveal } from '@/components/animations/ImageReveal';
import { Parallax } from '@/components/animations/Parallax';
import { Magnetic } from '@/components/animations/Magnetic';
import { ScrollProgress } from '@/components/animations/ScrollProgress';
import { Counter } from '@/components/animations/Counter';
import { StaggerGroup } from '@/components/animations/StaggerGroup';
import { useReveal } from '@/components/animations/useReveal';
import { fadeUp } from '@/components/animations/variants';
import logoImg from '../../../assets/images/logo.png';
import mineOperationsImg from '../../../assets/images/Mine operations.png';
import fieldOverviewImg from '../../../assets/images/field overview.png';

const problems = [
  { icon: Layers, title: 'Inconsistent Data', detail: 'The same information exists in different forms across different sites, creating confusion and unreliable records.' },
  { icon: BarChart3, title: 'Slow Decisions', detail: 'By the time head office sees a problem, it is already old news — critical delays in governance.' },
  { icon: ShieldCheck, title: 'No Transparency', detail: 'Regulators and corporate management cannot see what is actually happening at a site in real time.' },
  { icon: FileCheck, title: 'Missed Compliance Gaps', detail: 'Nobody is systematically catching repeat violations or high-risk patterns before they escalate.' },
  { icon: Users, title: 'Weak Field Monitoring', detail: 'What inspectors actually do on the ground is not reliably captured or verified against standards.' },
];

const capabilities = [
  { icon: ShieldCheck, label: 'Compliance', detail: 'Statutory tracking across every operation' },
  { icon: BarChart3, label: 'Risk intelligence', detail: 'Predictive signals before incidents happen' },
  { icon: MapPin, label: 'Mine mapping', detail: 'Spatial context for every inspection' },
  { icon: Bell, label: 'Live alerts', detail: 'Deadlines and high-risk events, surfaced early' },
];

const systemComponents = [
  { icon: Layers, label: 'Centralized Dashboard', detail: 'Real-time compliance view, role-based for every stakeholder', x: 50, y: 10 },
  { icon: Cpu, label: 'AI / Analytics Engine', detail: 'Detects compliance risks, anomalies and generates predictive alerts', x: 20, y: 38 },
  { icon: Smartphone, label: 'Geo-Tagged Mobile App', detail: 'Field inspections, safety observations, incident reporting — works offline', x: 80, y: 38 },
  { icon: Workflow, label: 'Automated Workflows', detail: 'Alerts, escalations, digital approvals, auto-generated statutory reports', x: 30, y: 70 },
  { icon: MapPin, label: 'Digital Infrastructure', detail: 'GIS mapping, OCR digitization, secure immutable audit trails', x: 70, y: 70 },
];

const workflow = [
  { number: '01', title: 'Observe', detail: 'Capture field evidence with photos, GPS and notes.' },
  { number: '02', title: 'Understand', detail: 'Turn operational patterns into a clear risk picture.' },
  { number: '03', title: 'Act', detail: 'Assign corrective action and verify resolution.' },
];

const VisualPanel = ({ label, className = '', imageSrc }: { label: string; className?: string; imageSrc?: string }) => (
  <div className={`relative overflow-hidden border border-[#526067]/60 bg-[#151B1E] ${className}`} data-image-slot={label}>
    {imageSrc ? (
      <img src={imageSrc} alt="Mine operations" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(216,138,50,0.18),transparent_32%),linear-gradient(135deg,#182226_0%,#0B0D0E_58%,#28343A_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(191,205,208,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(191,205,208,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
      </>
    )}
    <div className="absolute left-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#B6C2C5]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#D88A32] shadow-[0_0_12px_#D88A32]" />
      {label}
    </div>
  </div>
);

export const LandingPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const parallaxBgX = useTransform(mouseX, [-0.5, 0.5], [-12, 12]);
  const parallaxBgY = useTransform(mouseY, [-0.5, 0.5], [-8, 8]);
  const parallaxMidX = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);
  const parallaxMidY = useTransform(mouseY, [-0.5, 0.5], [-4, 4]);
  const parallaxFgX = useTransform(mouseX, [-0.5, 0.5], [-18, 18]);
  const parallaxFgY = useTransform(mouseY, [-0.5, 0.5], [-12, 12]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0D0E] text-[#F4F5F5] selection:bg-[#D88A32] selection:text-[#0B0D0E]">
      <ScrollProgress />

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#526067]/30 bg-[#0B0D0E]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="group flex items-center">
            <img src={logoImg} alt="AgniStrot" className="h-15 w-[138px] object-contain" />
          </Link>
          <div className="hidden items-center gap-8 text-[12px] uppercase tracking-[0.18em] text-[#8C9A9F] md:flex">
            <a href="#system" className="transition-colors hover:text-[#F4F5F5]">The system</a>
            <a href="#problem" className="transition-colors hover:text-[#F4F5F5]">The problem</a>
            <a href="#capabilities" className="transition-colors hover:text-[#F4F5F5]">Capabilities</a>
            <a href="#impact" className="transition-colors hover:text-[#F4F5F5]">Impact</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Magnetic strength={6}>
              <Link to="/login"><Button variant="primary" size="sm">Get started <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></Link>
            </Magnetic>
            <button aria-label="Open menu" className="ml-1 flex h-9 w-9 items-center justify-center border border-[#526067]/60 text-[#AAB5B8] md:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        id="system"
        onMouseMove={handleMouseMove}
        style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
        className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-[1440px] items-end gap-10 px-5 pb-14 pt-30 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:px-12 lg:pb-16 lg:pt-36"
      >
        {/* Background glow — moves with mouse */}
        <motion.div
          style={{ x: parallaxBgX, y: parallaxBgY }}
          className="pointer-events-none absolute -left-40 top-36 h-[420px] w-[420px] rounded-full bg-[#D88A32]/[0.06] blur-[100px]"
        />

        {/* Left — Text */}
        <div className="relative z-10 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]"
          >
            <span className="h-px w-10 bg-[#D88A32]" /> AI-powered governance / 2026
          </motion.div>

          <h1 className="max-w-[620px] text-[clamp(3.4rem,7vw,7rem)] font-semibold leading-[1.05] tracking-[-0.065em] text-[#E8ECEB]">
            <LineReveal
              lines={['Safer ground.', 'Clearer action.']}
              as="span"
              lineClassName="block"
              delay={0.25}
              mode="mount"
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-[440px] text-base leading-7 text-[#9BA8AC]"
          >
            A living intelligence layer for coal mine governance, turning field reality into accountable decisions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-5"
          >
            <Magnetic strength={8}>
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Enter the system <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
              </Link>
            </Magnetic>
            <a
              href="#capabilities"
              className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[#AAB5B8]"
            >
              Explore the field
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#526067] transition-colors group-hover:border-[#D88A32] group-hover:text-[#D88A32]">
                <ArrowDownRight className="h-4 w-4" />
              </span>
            </a>
          </motion.div>
        </div>

        {/* Right — Visual with parallax layers */}
        <motion.div
          style={{ x: parallaxMidX, y: parallaxMidY }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <ImageReveal delay={0.5} direction="left" mode="mount" className="aspect-[1.16/1] min-h-[360px] w-full sm:min-h-[430px] lg:aspect-[1.22/1] lg:max-h-[min(520px,calc(100vh_-_380px))]">
            <VisualPanel label="Mine operations / live view" imageSrc={mineOperationsImg} className="h-full w-full" />
          </ImageReveal>

          <motion.div
            style={{ x: parallaxFgX, y: parallaxFgY }}
            className="absolute -bottom-5 -right-3 flex items-center gap-3 border border-[#526067]/70 bg-[#111719] px-4 py-3 sm:-right-6"
          >
            <span className="text-2xl font-semibold tracking-[-0.06em] text-[#D88A32]">118+</span>
            <span className="max-w-[90px] text-[9px] uppercase leading-4 tracking-[0.18em] text-[#AAB5B8]">
              mines<br />monitored
            </span>
          </motion.div>

          <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#DDE4E3]/40 text-[#DDE4E3]">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Metrics Bar ─────────────────────────────────── */}
      <section className="border-y border-[#526067]/40 bg-[#121719]" aria-label="System metrics">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#526067]/40 sm:grid-cols-4">
          {[
            { value: 94.2, suffix: '%', label: 'compliance rate', decimals: 1 },
            { value: 2500, suffix: '+', label: 'inspections logged', decimals: 0 },
            { value: 45, suffix: '%', label: 'faster resolution', decimals: 0 },
            { value: 24, suffix: '/7', label: 'operational visibility', decimals: 0 },
          ].map(({ value, suffix, label, decimals }) => (
            <ScrollReveal key={label} className="px-5 py-7 sm:px-8 lg:px-12">
              <p className="text-2xl font-medium tracking-[-0.05em] text-[#E5EAE9] sm:text-3xl">
                <Counter from={0} to={value} suffix={suffix} decimals={decimals} duration={2.2} />
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#829095]">{label}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── The Problem ─────────────────────────────────── */}
      <section id="problem" aria-labelledby="problem-title" className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <ScrollReveal>
              <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Why this exists</p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 id="problem-title" className="max-w-[650px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">
                <LineReveal
                  lines={['Coal mining runs on paper.', 'That costs lives.']}
                  as="span"
                  delay={0.15}
                />
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.3}>
            <p className="max-w-[340px] text-sm leading-6 text-[#8C9A9F]">
              Five concrete problems emerge when governance happens in filing cabinets and scattered spreadsheets.
            </p>
          </ScrollReveal>
        </div>

        <StaggerGroup
          stagger={0.08}
          delayChildren={0.1}
          className="grid gap-0 border-t border-[#526067]/50 md:grid-cols-2 lg:grid-cols-5"
        >
          {problems.map(({ icon: Icon, title, detail }, i) => (
            <motion.article
              key={title}
              variants={fadeUp}
              custom={i * 0.08}
              className="group border-b border-[#526067]/50 p-6 pl-0 transition-colors hover:bg-[#121719]/60 md:border-r md:pl-6 lg:min-h-[260px] lg:border-b-0 lg:first:pl-0"
            >
              <div className="mb-12 flex items-center justify-between">
                <Icon className="h-5 w-5 text-[#D88A32]" />
                <span className="text-[10px] text-[#657379]">0{i + 1}</span>
              </div>
              <h3 className="mb-3 text-lg font-medium text-[#E5EAE9] transition-colors group-hover:text-[#D88A32]">{title}</h3>
              <p className="max-w-[210px] text-sm leading-6 text-[#849196]">{detail}</p>
            </motion.article>
          ))}
        </StaggerGroup>
      </section>

      {/* ── Capabilities — Infinite Marquee ─────────────── */}
      <section id="capabilities" aria-labelledby="capabilities-title" className="relative lg:py-6">
        <div className="mx-auto max-w-[1440px] px-5 pt-24 sm:px-8 lg:px-12 lg:pt-28">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <ScrollReveal>
                <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">One source of truth</p>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <h2 id="capabilities-title" className="max-w-[600px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">
                  <LineReveal
                    lines={['The mine,', 'made legible.']}
                    as="span"
                    delay={0.15}
                  />
                </h2>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.3}>
              <p className="max-w-[300px] text-sm leading-6 text-[#8C9A9F]">
                Connect compliance, people and place in one quiet operational rhythm.
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Infinite marquee — pauses on hover */}
        <div className="marquee group relative overflow-hidden border-y border-[#526067]/40 py-8">
          <div className="marquee-track flex w-max items-stretch">
            {[...capabilities, ...capabilities].map(({ icon: Icon, label, detail }, i) => (
              <div
                key={`${label}-${i}`}
                className="group/card relative mr-8 flex w-[300px] shrink-0 flex-col justify-between border border-[#526067]/50 bg-[#0B0D0E]/90 p-8 transition-colors hover:border-[#D88A32]/40 lg:w-[380px]"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-[#D88A32]" />
                  <span className="text-[10px] text-[#657379]">0{(i % capabilities.length) + 1}</span>
                </div>
                <div>
                  <h3 className="mb-3 text-2xl font-medium text-[#E5EAE9] transition-colors group-hover/card:text-[#D88A32]">{label}</h3>
                  <p className="text-sm leading-6 text-[#849196]">{detail}</p>
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#D88A32] transition-all duration-500 group-hover/card:w-full" />
              </div>
            ))}
          </div>

          {/* Edge fade masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0D0E] to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0D0E] to-transparent sm:w-24" />
        </div>
      </section>

      {/* ── System Components ───────────────────────────── */}
      <section id="system-components" aria-labelledby="system-title" className="bg-[#121719] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <ScrollReveal>
                <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Five components, one platform</p>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <h2 id="system-title" className="max-w-[600px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">
                  <LineReveal
                    lines={['Built to work', 'as one system.']}
                    as="span"
                    delay={0.15}
                  />
                </h2>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.3}>
              <p className="max-w-[340px] text-sm leading-6 text-[#8C9A9F]">
                Each component strengthens the others — from field capture to executive intelligence.
              </p>
            </ScrollReveal>
          </div>

          <SystemVisual components={systemComponents} />
        </div>
      </section>

      {/* ── Workflow ────────────────────────────────────── */}
      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <ScrollReveal>
              <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">From evidence to action</p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">
                <LineReveal
                  lines={['Every signal', 'has a next step.']}
                  as="span"
                  delay={0.15}
                />
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="mt-12 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#879398]">
                <span className="h-px w-12 bg-[#D88A32]" /> Field intelligence, made accountable
              </div>
            </ScrollReveal>
          </div>

          <StaggerGroup
            stagger={0.1}
            delayChildren={0.1}
            viewportMargin="-60px"
            className="grid gap-0 border-t border-[#526067]/50"
          >
            {workflow.map((item, i) => (
              <motion.div
                key={item.number}
                variants={fadeUp}
                custom={i * 0.1}
                className="grid grid-cols-[55px_1fr] items-center gap-5 border-b border-[#526067]/50 py-6 sm:grid-cols-[10px_1fr] sm:gap-8"
              >
                <span className="text-sm text-[#D88A32]">{item.number}</span>
                <div>
                  <h3 className="mb-2 text-xl font-medium text-[#E5EAE9]">{item.title}</h3>
                  <p className="max-w-[380px] text-sm leading-6 text-[#849196]">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── Impact ──────────────────────────────────────── */}
      <section id="impact" aria-labelledby="impact-title" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-32">
        <ImageReveal delay={0.2} direction="left" className="min-h-[360px] lg:min-h-[470px]">
          <Parallax speed={0.08} className="h-full w-full">
            <VisualPanel label="Operations intelligence / field overview" imageSrc={fieldOverviewImg} className="h-full min-h-[360px] lg:min-h-[470px]" />
          </Parallax>
        </ImageReveal>

        <div className="flex flex-col justify-between border-t border-[#526067]/50 pt-6 lg:border-t-0 lg:pt-0">
          <div>
            <ScrollReveal>
              <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Built for the people in charge</p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 id="impact-title" className="max-w-[450px] text-4xl font-medium leading-[0.95] tracking-[-0.05em] text-[#E8ECEB] sm:text-5xl">
                <LineReveal
                  lines={['Govern with', 'confidence.']}
                  as="span"
                  delay={0.15}
                />
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="mt-7 max-w-[400px] text-sm leading-7 text-[#8C9A9F]">
                Give inspectors, officers and decision-makers the same clear view of what is happening, what matters and what needs to happen next.
              </p>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.3}>
            <div className="mt-12 flex items-center gap-4 border-t border-[#526067]/50 pt-5 text-sm text-[#B6C2C5]">
              <Users className="h-5 w-5 text-[#D88A32]" /> Role-based access for every responsibility
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="px-5 pb-24 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 border-t border-[#526067]/50 pt-12 md:flex-row md:items-end">
          <div>
            <ScrollReveal>
              <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Ready when you are</p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="max-w-[600px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">
                <LineReveal
                  lines={['Make the next', 'decision clearer.']}
                  as="span"
                  delay={0.15}
                />
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.3}>
            <Magnetic strength={10}>
              <Link to="/login">
                <Button variant="primary" size="lg">
                  Start monitoring <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
              </Link>
            </Magnetic>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[#526067]/30 px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 text-[9px] uppercase tracking-[0.2em] text-[#718087] sm:flex-row">
          <span>Smart Mine Governance System</span>
          <span>SIH26024 / Ministry of Coal</span>
        </div>
      </footer>
    </main>
  );
};

/* ── Sub-components ──────────────────────────────────── */

function SystemVisual({ components }: { components: typeof systemComponents }) {
  const { ref, inView } = useReveal(true, '-100px');
  const connections: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 4],
  ];

  return (
    <div ref={ref} className="relative mx-auto aspect-[16/9] max-w-[900px]">
      {/* Connection lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {connections.map(([from, to], i) => {
          const fromNode = components[from];
          const toNode = components[to];
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={fromNode.x}
              y1={fromNode.y + 4}
              x2={toNode.x}
              y2={toNode.y + 4}
              stroke="#D88A32"
              strokeWidth="0.15"
              strokeOpacity="0.4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.5 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {components.map(({ icon: Icon, label, detail, x, y }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute flex flex-col items-center text-center"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#526067]/60 bg-[#0B0D0E] shadow-[0_0_30px_rgba(216,138,50,0.08)]">
            <Icon className="h-5 w-5 text-[#D88A32]" />
          </div>
          <p className="mb-1 text-xs font-medium text-[#E5EAE9]">{label}</p>
          <p className="hidden max-w-[160px] text-[10px] leading-4 text-[#849196] lg:block">{detail}</p>
        </motion.div>
      ))}

      {/* Center label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#D88A32]">AgniStrot</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[#718087]">Smart Governance</p>
      </motion.div>
    </div>
  );
}
