import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { authService } from '@/services/authService';
import { ROLE_CONFIG } from '@/utils/roles';
import type { UserRole } from '@/types';
import loginBackgroundImg from '../../../assets/images/login-bg.png';
import logoImg from '../../../assets/images/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    email: z.string().email('Please enter a valid email').max(254, 'Email is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    role: z.enum(['field_officer', 'mine_official', 'corporate_manager', 'regulator'], {
      required_error: 'Please select a role',
    }),
    siteId: z.string().nullable(),
  })
  .superRefine((values, ctx) => {
    const siteScoped = values.role === 'field_officer' || values.role === 'mine_official';
    if (siteScoped && !values.siteId) {
      ctx.addIssue({ code: 'custom', path: ['siteId'], message: 'Site is required for this role.' });
    }
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

const DEMO_ACCOUNTS = [
  { email: 'rahul@agnistrot.com', role: 'Field Officer' },
  { email: 'priya@agnistrot.com', role: 'Mine Officer' },
  { email: 'amit@agnistrot.com', role: 'Corporate Manager' },
  { email: 'meena@agnistrot.com', role: 'Regulator' },
];

type AuthMode = 'signin' | 'signup';

export const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupCreated, setSignupCreated] = useState(false);
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const { data: dashboard } = useDashboardSummary();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    watch: watchSignup,
    formState: { errors: signupErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { siteId: null },
  });

  const siteOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of dashboard?.sites ?? []) {
      if (s.siteId && !seen.has(s.siteId)) seen.set(s.siteId, s.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [dashboard]);

  const selectedRole = watchSignup('role');
  const siteScoped = selectedRole === 'field_officer' || selectedRole === 'mine_official';

  const switchMode = (next: AuthMode) => {
    clearError();
    setSignupError(null);
    setMode(next);
  };

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

  const onSubmitSignup = async (data: RegisterFormData) => {
    try {
      setSignupError(null);
      setSignupSubmitting(true);
      await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        siteId: siteScoped ? data.siteId : null,
      });
      setSignupCreated(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSignupError(message);
    } finally {
      setSignupSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-x-hidden bg-[#0B0D0E] px-4 py-8 sm:items-center sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(216,138,50,0.12),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(77,163,255,0.08),transparent_28%)]" />
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl overflow-hidden rounded-[26px] border border-[#2A383F] bg-[#111A20] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="flex min-h-[560px] flex-col min-[900px]:flex-row">
          <div className="flex w-full flex-col justify-center p-7 sm:p-10 min-[900px]:w-1/2">
            {mode === 'signin' ? (
              <>
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
                  <div className="grid grid-cols-1 gap-2 text-center text-[10px] min-[440px]:grid-cols-2">
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
              </>
            ) : signupCreated ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#35C759]" />
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Account created</h2>
                <p className="mt-2 text-sm text-[#8D969B]">
                  Your account is ready. Sign in with the credentials you just provided.
                </p>
                <Button
                  type="button"
                  className="mt-6 w-full"
                  onClick={() => {
                    setSignupCreated(false);
                    switchMode('signin');
                  }}
                >
                  Go to sign in <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 text-[#35C759]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">New account setup</span>
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Create account</h2>
                <p className="mt-2 text-sm text-[#8D969B]">Add a new account to the governance platform</p>

                <form onSubmit={handleSignupSubmit(onSubmitSignup)} className="mt-8 space-y-4">
                  {signupError && (
                    <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
                      <p className="text-sm text-[#FF4D4F]">{signupError}</p>
                    </div>
                  )}
                  <Input
                    label="Full name"
                    placeholder="Enter full name"
                    leftIcon={<User className="h-4 w-4" />}
                    error={signupErrors.name?.message}
                    {...registerSignup('name')}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@company.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                    error={signupErrors.email?.message}
                    {...registerSignup('email')}
                  />
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      leftIcon={<Lock className="h-4 w-4" />}
                      error={signupErrors.password?.message}
                      {...registerSignup('password')}
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
                  <Select
                    label="Role"
                    options={roleOptions}
                    placeholder="Select a role"
                    error={signupErrors.role?.message}
                    {...registerSignup('role')}
                  />
                  {siteScoped && (
                    <Select
                      label="Site"
                      options={siteOptions}
                      placeholder="Select a site"
                      error={signupErrors.siteId?.message}
                      {...registerSignup('siteId')}
                    />
                  )}
                  <Button type="submit" className="w-full" isLoading={signupSubmitting}>
                    Create account <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-[#8D969B]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#35C759]" />
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="text-[#D88A32] hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>

          <div className="relative order-first block min-h-[200px] min-[900px]:order-none min-[900px]:min-h-full min-[900px]:w-1/2">
            <img
              src={loginBackgroundImg}
              alt="Open-pit mine operations"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,28,0.72)_0%,rgba(7,18,28,0.38)_18%,transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6 sm:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/" className="flex w-fit items-center">
                  <img src={logoImg} alt="AgniStrot" className="h-10 w-auto object-contain min-[900px]:h-15 min-[900px]:w-30.5" />
                </Link>
                <div className="flex items-center rounded-full border border-[#2A383F] bg-[#111A20]/90 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                      mode === 'signin'
                        ? 'bg-[#D88A32] text-white'
                        : 'text-[#8D969B] hover:text-[#F4F7F8]'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                      mode === 'signup'
                        ? 'bg-[#D88A32] text-white'
                        : 'text-[#8D969B] hover:text-[#F4F7F8]'
                    }`}
                  >
                    Sign up
                  </button>
                </div>
              </div>
              <div className="hidden max-w-sm min-[900px]:block">
                <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#F5B942]">
                  Governance platform / field intelligence
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Hello there.</h1>
                <p className="mt-3 text-sm leading-6 text-[#C0D0D7]">
                  Review your latest field signals and keep every operational decision grounded in
                  evidence — inspections, incidents, attendance and alerts across every site.
                </p>
              </div>
              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0] min-[900px]:flex">
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