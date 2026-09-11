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
import loginBackgroundImg from '../../../assets/images/login-bg.png';
import structuralBgImg from '../../../assets/images/Structural Weakness in Support Beam-clean.png';
import logoImg from '../../../assets/images/logo.png';
import type { UserRole } from '@/types';

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

const allRoleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

const PUBLIC_ROLES: UserRole[] = ['corporate_manager', 'regulator'];

export const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: dashboard } = useDashboardSummary();

  const siteOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of dashboard?.sites ?? []) {
      if (s.siteId && !seen.has(s.siteId)) seen.set(s.siteId, s.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [dashboard]);

  // Public users can only pick roles that don't require a site
  const availableRoles = isAuthenticated && siteOptions.length > 0
    ? allRoleOptions
    : allRoleOptions.filter((r) => PUBLIC_ROLES.includes(r.value as UserRole));

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { siteId: null },
  });

  const selectedRole = watch('role');
  const siteScoped = selectedRole === 'field_officer' || selectedRole === 'mine_official';

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setSubmitError(null);
      setSubmitting(true);
      await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        siteId: siteScoped ? data.siteId : null,
      });
      setCreated(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-y-auto bg-[#0b0d0e00] px-4 py-10 sm:px-8">
        <img src={structuralBgImg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[#0b0d0e00]/80" />
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-[#2A383F] bg-[#111A20] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#35C759]" />
          <h2 className="mt-4 text-2xl font-semibold text-[#F4F7F8]">Account created</h2>
          <p className="mt-2 text-sm text-[#8D969B]">
            Your account is ready. You can now sign in with your credentials.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="ghost" onClick={() => { setCreated(false); }}>
              Register another
            </Button>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-y-auto bg-[#0B0D0E] px-4 py-1 sm:px-8">
      <img src={structuralBgImg} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[#0B0D0E]/80" />
      <div className="m-auto w-full max-w-5xl">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full overflow-hidden rounded-[26px] border border-[#2A383F] backdrop-blur-[1px] bg-[#00000034] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
      >
        <div className="flex min-h-[440px] flex-col min-[900px]:flex-row">
          <div className="flex w-full flex-col justify-center p-4 sm:p-5 min-[900px]:w-1/2">
            <div className="mb-1.5 flex items-center gap-2 text-[#35C759]">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Create your account</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Sign up</h2>
            <p className="mt-1 text-sm text-[#8D969B]">Join the governance platform</p>

            <div className="mt-3 flex rounded-lg border border-[#2A383F] bg-[#0D1318] p-1">
              <Link to="/login" className="flex-1 rounded-md py-2 text-center text-xs font-medium text-[#8D969B] transition-colors hover:text-[#F4F7F8]">Sign in</Link>
              <span className="flex-1 rounded-md bg-[#D88A32] py-2 text-center text-xs font-medium text-white">Sign up</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2.5">
              {submitError && (
                <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
                  <p className="text-sm text-[#FF4D4F]">{submitError}</p>
                </div>
              )}
              <Input
                compact
                label="Full name"
                placeholder="Enter full name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                compact
                label="Email"
                type="email"
                placeholder="you@company.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <div className="relative">
                <Input
                  compact
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-[#8D969B] hover:text-[#F4F7F8]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Select
                compact
                label="Role"
                options={availableRoles}
                placeholder="Select a role"
                error={errors.role?.message}
                {...register('role')}
              />
              {siteScoped && (
                <Select
                  compact
                  label="Site"
                  options={siteOptions}
                  placeholder="Select a site"
                  error={errors.siteId?.message}
                  {...register('siteId')}
                />
              )}
              <Button type="submit" className="w-full" isLoading={submitting}>
                Create account <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-2 border-t border-[#2A383F] pt-2">
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#8D969B]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#35C759]" />
                Already have an account?{' '}
                <Link to="/login" className="text-[#D88A32] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <div className="relative hidden min-h-full min-[900px]:block min-[900px]:w-1/2">
            <img
              src={loginBackgroundImg}
              alt="Open-pit mine operations"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,28,0.72)_0%,rgba(7,18,28,0.38)_18%,transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6 sm:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/" className="flex w-fit items-center">
                  <img src={logoImg} alt="AgniStrot" className="h-10 w-auto object-contain min-[900px]:h-15 min-[900px]:w-37.5" />
                </Link>
                {/* <div className="flex items-center rounded-full border border-[#2A383F] bg-[#111A20]/90 p-1">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="rounded-full px-4 py-1.5 text-xs font-medium text-[#8D969B] transition-colors hover:text-[#F4F7F8]"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="rounded-full bg-[#D88A32] px-4 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    Sign up
                  </button>
                </div> */}
              </div>
              <div className="hidden max-w-sm min-[900px]:block">
                <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#F5B942]">
                  Governance platform / user management
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">New team member</h1>
                <p className="mt-3 text-sm leading-6 text-[#C0D0D7]">
                  Field officers and mine officials are bound to the site they work from. Corporate managers and regulators operate cross-site.
                </p>
              </div>
              <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0] min-[900px]:flex">
                <span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />
                Create your account
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      <Link
        to="/login"
        className="mt-2 flex items-center justify-center gap-1 text-sm text-[#8D969B] hover:text-[#D88A32]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      </div>
    </main>
  );
};
