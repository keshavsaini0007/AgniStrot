import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import loginBackgroundImg from '../../../assets/images/login-bg.png';
import logoImg from '../../../assets/images/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { email: 'rahul@agnistrot.com', role: 'Field Officer' },
  { email: 'priya@agnistrot.com', role: 'Mine Officer' },
  { email: 'amit@agnistrot.com', role: 'Corporate Manager' },
  { email: 'meena@agnistrot.com', role: 'Regulator' },
];

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      setSubmitting(true);
      await login(data);
      navigate('/app/dashboard');
    } catch {
      // Error is handled by the auth store
    } finally {
      setSubmitting(false);
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
        <div className="flex min-h-[560px] flex-col min-[900px]:flex-row">
          <div className="flex w-full flex-col justify-center p-7 sm:p-10 min-[900px]:w-1/2">
            <div className="mb-3 flex items-center gap-2 text-[#35C759]">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Secure workspace access</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Sign in</h2>
            <p className="mt-2 text-sm text-[#8D969B]">Access the governance platform</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
                  <p className="text-sm text-[#FF4D4F]">{error}</p>
                </div>
              )}
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-[#8D969B] hover:text-[#F4F7F8]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full" isLoading={isLoading || submitting}>
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-7 border-t border-[#2A383F] pt-5">
              <p className="mb-3 text-center text-xs uppercase tracking-[0.16em] text-[#8299A7]">
                Demo accounts (password: password123)
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.email}
                    className="rounded-lg border border-[#2A383F] bg-[#172229] p-2"
                  >
                    <p className="text-[#C0D0D7]">{acc.email}</p>
                    <p className="mt-1 text-[#8299A7]">{acc.role}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#8D969B]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#35C759]" />
                Secure access — contact your administrator for an account.
              </p>
            </div>
          </div>

          <div className="relative hidden min-[900px]:block min-[900px]:w-1/2">
            <img
              src={loginBackgroundImg}
              alt="Open-pit mine operations"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,28,0.72)_0%,rgba(7,18,28,0.38)_18%,transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between p-8 sm:p-10">
              <Link to="/" className="flex w-fit items-center">
                <img src={logoImg} alt="AgniStrot" className="h-12 w-37.5 object-contain" />
              </Link>
              <div className="max-w-sm">
                <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#F5B942]">
                  Governance platform / field intelligence
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Hello there.</h1>
                <p className="mt-3 text-sm leading-6 text-[#C0D0D7]">
                  Review your latest field signals and keep every operational decision grounded in
                  evidence — inspections, incidents, attendance and alerts across every site.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
                <span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />
                System live / secure access
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      <Link
        to="/"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-sm text-[#8D969B] hover:text-[#D88A32]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
    </main>
  );
};