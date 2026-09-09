import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import loginBackgroundImg from '../../../assets/images/login-bg.png';
import logoImg from '../../../assets/images/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data);
      navigate('/app/dashboard');
    } catch {
      // Error is handled by the auth store
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D0E] px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(216,138,50,0.12),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(77,163,255,0.08),transparent_28%)]" />
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl overflow-hidden rounded-[26px] border border-[#2A383F] bg-[#111A20] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="hidden min-h-152.5 min-[900px]:block">
          <motion.div className="flex h-full w-full">
            <div className="flex w-1/2 flex-none items-center bg-[#111A20] p-8 xl:p-10"><LoginForm error={error} errors={errors} handleSubmit={handleSubmit} isLoading={isLoading} onSubmit={onSubmit} register={register} setIsSignUp={setIsSignUp} showPassword={showPassword} setShowPassword={setShowPassword} /></div>
            <div className="flex w-1/2 flex-none items-center bg-[#111A20] p-8 xl:p-10"><SignupForm setIsSignUp={setIsSignUp} /></div>
          </motion.div>
          <motion.div animate={{ x: isSignUp ? '0%' : '100%' }} transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }} className="absolute inset-y-0 left-0 z-10 w-1/2 overflow-hidden rounded-3xl p-2">
            <div className="relative h-full overflow-hidden rounded-[20px]"><img src={loginBackgroundImg} alt="Open-pit mine operations" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,28,0.72)_0%,rgba(7,18,28,0.38)_18%,transparent_30%)]" /><PanelMessage isSignUp={isSignUp} setIsSignUp={setIsSignUp} /></div>
          </motion.div>
        </div>

        <div className="min-[900px]:hidden"><div className="relative min-h-55 overflow-hidden p-7"><img src={loginBackgroundImg} alt="Open-pit mine operations" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,18,28,0.3),rgba(7,18,28,0.84))]" /><PanelMessage isSignUp={isSignUp} setIsSignUp={setIsSignUp} compact /></div><div className="p-6 sm:p-10"><AnimatePresence mode="wait" initial={false}>{isSignUp ? <motion.div key="mobile-signup" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}><SignupForm setIsSignUp={setIsSignUp} /></motion.div> : <motion.div key="mobile-login" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}><LoginForm error={error} errors={errors} handleSubmit={handleSubmit} isLoading={isLoading} onSubmit={onSubmit} register={register} setIsSignUp={setIsSignUp} showPassword={showPassword} setShowPassword={setShowPassword} /></motion.div>}</AnimatePresence></div></div>
      </motion.section>
      <Link to="/" className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-sm text-[#8D969B] hover:text-[#D88A32]"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
    </main>
  );
};

const AuthHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div><div className="mb-3 flex items-center gap-2 text-[#35C759]"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] uppercase tracking-[0.2em]">Secure workspace access</span></div><h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">{title}</h2><p className="mt-2 text-sm text-[#8D969B]">{subtitle}</p></div>
);

const LoginForm = ({ error, errors, handleSubmit, isLoading, onSubmit, register, setIsSignUp, showPassword, setShowPassword }: any) => (
  <div className="w-full"><AuthHeading title="Sign in" subtitle="Access the governance platform" /><form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">{error && <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3"><p className="text-sm text-[#FF4D4F]">{error}</p></div>}<Input label="Email" type="email" placeholder="Enter your email" leftIcon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register('email')} /><div className="relative"><Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" leftIcon={<Lock className="h-4 w-4" />} error={errors.password?.message} {...register('password')} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-[#8D969B] hover:text-[#F4F7F8]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><Button type="submit" className="w-full" isLoading={isLoading}>Sign in <ArrowRight className="h-4 w-4" /></Button></form><div className="mt-7 border-t border-[#2A383F] pt-5"><p className="mb-3 text-center text-xs uppercase tracking-[0.16em] text-[#8299A7]">Demo accounts</p><div className="grid grid-cols-2 gap-2 text-center text-[10px]"><div className="rounded-lg border border-[#2A383F] bg-[#172229] p-2"><p className="text-[#C0D0D7]">rahul@coalindia.com</p><p className="mt-1 text-[#8299A7]">Mine Officer</p></div><div className="rounded-lg border border-[#2A383F] bg-[#172229] p-2"><p className="text-[#C0D0D7]">admin@coalindia.com</p><p className="mt-1 text-[#8299A7]">System Admin</p></div></div></div><p className="mt-6 text-center text-sm text-[#8D969B]">New to Smart Mine? <button type="button" onClick={() => setIsSignUp(true)} className="font-medium text-[#D88A32] hover:text-[#F5B942]">Sign up</button></p></div>
);

const SignupForm = ({ setIsSignUp }: { setIsSignUp: (value: boolean) => void }) => (
  <div className="w-full"><AuthHeading title="Create access" subtitle="Start your Smart Mine workspace" /><div className="mt-8 space-y-4"><Input label="Full name" placeholder="Enter your full name" leftIcon={<UserRound className="h-4 w-4" />} /><Input label="Work email" type="email" placeholder="you@company.com" leftIcon={<Mail className="h-4 w-4" />} /><Input label="Password" type="password" placeholder="Create a secure password" leftIcon={<Lock className="h-4 w-4" />} /><Button type="button" className="w-full" onClick={() => setIsSignUp(false)}>Request access <ArrowRight className="h-4 w-4" /></Button></div><p className="mt-7 text-center text-sm text-[#8D969B]">Already have access? <button type="button" onClick={() => setIsSignUp(false)} className="font-medium text-[#D88A32] hover:text-[#F5B942]">Log in</button></p></div>
);

const PanelMessage = ({ isSignUp, setIsSignUp, compact = false }: { isSignUp: boolean; setIsSignUp: (value: boolean) => void; compact?: boolean }) => (
  <div className={`relative flex h-full flex-col justify-between ${compact ? 'p-1' : 'p-8 sm:p-10'}`}><Link to="/" className="flex w-fit items-center"><img src={logoImg} alt="AgniStrot" className="h-12 w-37.5 object-contain" /></Link><div className="max-w-sm"><p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#F5B942]">Governance platform / field intelligence</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">{isSignUp ? 'Welcome back.' : 'Hello there.'}</h1><p className="mt-3 text-sm leading-6 text-[#C0D0D7]">{isSignUp ? 'Review your latest field signals and keep every operational decision grounded in evidence.' : 'Create your workspace access and connect your team to every mine, inspection and observation.'}</p><button type="button" onClick={() => setIsSignUp(!isSignUp)} className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#C0D0D7]/60 px-6 py-2 text-sm font-semibold text-[#F4F7F8] transition-colors hover:border-[#F5B942] hover:text-[#F5B942]">{isSignUp ? 'Log in' : 'Sign up'} <ArrowRight className="h-4 w-4" /></button></div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]"><span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />System live / secure access</div></div>
);