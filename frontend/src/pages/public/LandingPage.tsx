import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Bell,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const capabilities = [
  { icon: ShieldCheck, label: 'Compliance', detail: 'Statutory tracking across every operation' },
  { icon: BarChart3, label: 'Risk intelligence', detail: 'Predictive signals before incidents happen' },
  { icon: MapPin, label: 'Mine mapping', detail: 'Spatial context for every inspection' },
  { icon: Bell, label: 'Live alerts', detail: 'Deadlines and high-risk events, surfaced early' },
];

const workflow = [
  { number: '01', title: 'Observe', detail: 'Capture field evidence with photos, GPS and notes.' },
  { number: '02', title: 'Understand', detail: 'Turn operational patterns into a clear risk picture.' },
  { number: '03', title: 'Act', detail: 'Assign corrective action and verify resolution.' },
];

const VisualPanel = ({ label, className = '' }: { label: string; className?: string }) => (
  <div className={`relative overflow-hidden border border-[#526067]/60 bg-[#151B1E] ${className}`} data-image-slot={label}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(216,138,50,0.18),transparent_32%),linear-gradient(135deg,#182226_0%,#0B0D0E_58%,#28343A_100%)]" />
    <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(191,205,208,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(191,205,208,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />
    <div className="absolute left-6 top-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#B6C2C5]"><span className="h-1.5 w-1.5 rounded-full bg-[#D88A32] shadow-[0_0_12px_#D88A32]" />{label}</div>
    {/* <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4"><div><p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#8C9A9F]">Visual reference</p><p className="max-w-[230px] text-sm leading-relaxed text-[#E3E8E8]">Replace this panel with a mine, inspection or operations image.</p></div><ArrowDownRight className="h-5 w-5 shrink-0 text-[#D88A32]" /></div> */}
  </div>
);

export const LandingPage = () => {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0D0E] text-[#F4F5F5] selection:bg-[#D88A32] selection:text-[#0B0D0E]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#526067]/30 bg-[#0B0D0E]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="group flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#D88A32] text-xs font-bold tracking-[-0.08em] text-[#D88A32] transition-colors group-hover:bg-[#D88A32] group-hover:text-[#0B0D0E]">SM</span><span className="hidden text-[13px] font-medium uppercase tracking-[0.18em] text-[#D7DEDF] sm:block">Smart Mine<br />Governance</span></Link>
          <div className="hidden items-center gap-8 text-[12px] uppercase tracking-[0.18em] text-[#8C9A9F] md:flex"><a href="#system" className="transition-colors hover:text-[#F4F5F5]">The system</a><a href="#capabilities" className="transition-colors hover:text-[#F4F5F5]">Capabilities</a><a href="#impact" className="transition-colors hover:text-[#F4F5F5]">Impact</a></div>
          <div className="flex items-center gap-2 sm:gap-4"><Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link><Link to="/login"><Button variant="primary" size="sm">Get started <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></Link><button aria-label="Open menu" className="ml-1 flex h-9 w-9 items-center justify-center border border-[#526067]/60 text-[#AAB5B8] md:hidden"><Menu className="h-4 w-4" /></button></div>
        </div>
      </nav>

      <section id="system" className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-end gap-10 px-5 pb-16 pt-36 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:px-12 lg:pb-20 lg:pt-40">
        <div className="pointer-events-none absolute -left-40 top-36 h-[420px] w-[420px] rounded-full bg-[#D88A32]/[0.06] blur-[100px]" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10 pb-2"><div className="mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]"><span className="h-px w-10 bg-[#D88A32]" /> AI-powered governance / 2026</div><h1 className="max-w-[620px] text-[clamp(3.6rem,8vw,7.4rem)] font-semibold leading-[0.87] tracking-[-0.065em] text-[#E8ECEB]">Safer<br /><span className="text-[#D88A32]">ground.</span><br />Clearer action.</h1><p className="mt-9 max-w-[440px] text-base leading-7 text-[#9BA8AC]">A living intelligence layer for coal mine governance, turning field reality into accountable decisions.</p><div className="mt-10 flex flex-wrap items-center gap-5"><Link to="/login"><Button variant="primary" size="lg">Enter the system <ArrowRight className="ml-3 h-4 w-4" /></Button></Link><a href="#capabilities" className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-[#AAB5B8]">Explore the field <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#526067] transition-colors group-hover:border-[#D88A32] group-hover:text-[#D88A32]"><ArrowDownRight className="h-4 w-4" /></span></a></div></motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.8 }} className="relative"><VisualPanel label="Mine operations / live view" className="aspect-[1.12/1] min-h-[410px] w-full sm:min-h-[510px] lg:aspect-[1.14/1]" /><div className="absolute -bottom-5 -right-3 flex items-center gap-3 border border-[#526067]/70 bg-[#111719] px-4 py-3 sm:-right-6"><span className="text-2xl font-semibold tracking-[-0.06em] text-[#D88A32]">118+</span><span className="max-w-[90px] text-[9px] uppercase leading-4 tracking-[0.18em] text-[#AAB5B8]">mines<br />monitored</span></div><div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#DDE4E3]/40 text-[#DDE4E3]"><Sparkles className="h-4 w-4" /></div></motion.div>
      </section>

      <section className="border-y border-[#526067]/40 bg-[#121719]" aria-label="System metrics"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#526067]/40 sm:grid-cols-4">{[['94.2%', 'compliance rate'], ['2,500+', 'inspections logged'], ['45%', 'faster resolution'], ['24/7', 'operational visibility']].map(([value, label]) => <div key={label} className="px-5 py-7 sm:px-8 lg:px-12"><p className="text-2xl font-medium tracking-[-0.05em] text-[#E5EAE9] sm:text-3xl">{value}</p><p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#829095]">{label}</p></div>)}</div></section>

      <section id="capabilities" aria-labelledby="capabilities-title" className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">One source of truth</p><h2 id="capabilities-title" className="max-w-[600px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">The mine,<br /><span className="text-[#728087]">made legible.</span></h2></div><p className="max-w-[300px] text-sm leading-6 text-[#8C9A9F]">Connect compliance, people and place in one quiet operational rhythm.</p></div><div className="grid border-t border-[#526067]/50 md:grid-cols-2 lg:grid-cols-4">{capabilities.map(({ icon: Icon, label, detail }, index) => <motion.article key={label} aria-label={`${label} capability`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="group border-b border-[#526067]/50 p-6 pl-0 md:border-r md:pl-5 lg:min-h-[210px] lg:border-b-0 lg:first:pl-0"><div className="mb-12 flex items-center justify-between"><Icon className="h-5 w-5 text-[#D88A32]" /><span className="text-[10px] text-[#657379]">0{index + 1}</span></div><h3 className="mb-3 text-lg font-medium text-[#E5EAE9] transition-colors group-hover:text-[#D88A32]">{label}</h3><p className="max-w-[190px] text-sm leading-6 text-[#849196]">{detail}</p></motion.article>)}</div></section>

      <section className="bg-[#121719] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">From evidence to action</p><h2 className="text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">Every signal<br /><span className="text-[#728087]">has a next step.</span></h2><div className="mt-12 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#879398]"><span className="h-px w-12 bg-[#D88A32]" /> Field intelligence, made accountable</div></div><div className="grid gap-0 border-t border-[#526067]/50">{workflow.map((item) => <div key={item.number} className="grid grid-cols-[55px_1fr] gap-5 border-b border-[#526067]/50 py-6 sm:grid-cols-[80px_1fr] sm:gap-8"><span className="text-sm text-[#D88A32]">{item.number}</span><div><h3 className="mb-2 text-xl font-medium text-[#E5EAE9]">{item.title}</h3><p className="max-w-[380px] text-sm leading-6 text-[#849196]">{item.detail}</p></div></div>)}</div></div></section>

      <section id="impact" aria-labelledby="impact-title" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-32"><VisualPanel label="Operations intelligence / field overview" className="min-h-[360px] lg:min-h-[470px]" /><div className="flex flex-col justify-between border-t border-[#526067]/50 pt-6 lg:pt-0"><div><p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Built for the people in charge</p><h2 id="impact-title" className="max-w-[450px] text-4xl font-medium leading-[0.95] tracking-[-0.05em] text-[#E8ECEB] sm:text-5xl">Govern with<br />confidence.</h2><p className="mt-7 max-w-[400px] text-sm leading-7 text-[#8C9A9F]">Give inspectors, officers and decision-makers the same clear view of what is happening, what matters and what needs to happen next.</p></div><div className="mt-12 flex items-center gap-4 border-t border-[#526067]/50 pt-5 text-sm text-[#B6C2C5]"><Users className="h-5 w-5 text-[#D88A32]" /> Role-based access for every responsibility</div></div></section>

      <section className="px-5 pb-24 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 border-t border-[#526067]/50 pt-12 md:flex-row md:items-end"><div><p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#D88A32]">Ready when you are</p><h2 className="max-w-[600px] text-4xl font-medium leading-none tracking-[-0.05em] text-[#E8ECEB] sm:text-6xl">Make the next<br /><span className="text-[#D88A32]">decision clearer.</span></h2></div><Link to="/login"><Button variant="primary" size="lg">Start monitoring <ArrowRight className="ml-3 h-4 w-4" /></Button></Link></div></section>

      <footer className="border-t border-[#526067]/30 px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 text-[9px] uppercase tracking-[0.2em] text-[#718087] sm:flex-row"><span>Smart Mine Governance System</span><span>SIH26024 / Ministry of Coal</span></div></footer>
    </main>
  );
};
