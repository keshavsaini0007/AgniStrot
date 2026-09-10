import { useEffect, useMemo, useState } from 'react';
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

const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

export const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: dashboard } = useDashboardSummary();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  // Redirect non-corporate users to dashboard
  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'corporate_manager') {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const siteOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of dashboard?.sites ?? []) {
      if (s.siteId && !seen.has(s.siteId)) seen.set(s.siteId, s.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [dashboard]);

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

  // Guard: still loading auth
  if (!isAuthenticated || !user) return null;

  // Success state
  if (created) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D0E] px-4 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(216,138,50,0.12),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(77,163,255,0.08),transparent_28%)]" />
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-[#2A383F] bg-[#111A20] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#35C759]" />
          <h2 className="mt-4 text-2xl font-semibold text-[#F4F7F8]">User created</h2>
          <p className="mt-2 text-sm text-[#8D969B]">
            The new account is ready. They can log in with the credentials you provided.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="ghost" onClick={() => { setCreated(false); }}>
              Add another
            </Button>
            <Button variant="primary" onClick={() => navigate('/app/users')}>
              Back to Users
            </Button>
          </div>
        </motion.section>
      </main>
    );
  }

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
              <span className="text-[10px] uppercase tracking-[0.2em]">User management</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">Create user</h2>
            <p className="mt-2 text-sm text-[#8D969B]">Add a new account to the governance platform</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              {submitError && (
                <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
                  <p className="text-sm text-[#FF4D4F]">{submitError}</p>
                </div>
              )}
              <Input
                label="Full name"
                placeholder="Enter full name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@company.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <div className="relative">
                <Input
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
                  className="absolute right-3 top-9 text-[#8D969B] hover:text-[#F4F7F8]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Select
                label="Role"
                options={roleOptions}
                placeholder="Select a role"
                error={errors.role?.message}
                {...register('role')}
              />
              {siteScoped && (
                <Select
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

            <div className="mt-7 border-t border-[#2A383F] pt-5">
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#8D969B]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#35C759]" />
                Back to{' '}
                <Link to="/app/users" className="text-[#D88A32] hover:underline">
                  User management
                </Link>
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
              <Link to="/app/dashboard" className="flex w-fit items-center">
                <img src={logoImg} alt="AgniStrot" className="h-15 w-37.5 object-contain" />
              </Link>
              <div className="max-w-sm">
                <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#F5B942]">
                  Governance platform / user management
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#F4F7F8]">New team member</h1>
                <p className="mt-3 text-sm leading-6 text-[#C0D0D7]">
                  Field officers and mine officials are bound to the site they work from. Corporate managers and regulators operate cross-site.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#B3C5D0]">
                <span className="h-2 w-2 rounded-full bg-[#35C759] shadow-[0_0_10px_#35C759]" />
                Corporate access only
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      <Link
        to="/app/users"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 text-sm text-[#8D969B] hover:text-[#D88A32]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>
    </main>
  );
};
