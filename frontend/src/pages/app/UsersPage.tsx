import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, UsersRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { queryKeys } from '@/hooks/useMines';
import { usersService } from '@/services/usersService';
import { authService } from '@/services/authService';
import { ROLE_CONFIG } from '@/utils/roles';
import { formatDate } from '@/utils/date';
import { sanitizeErrorMessage } from '@/utils/security';
import type { User, UserRole } from '@/types';
import usersHeaderImg from '../../../assets/images/Users.png';

const userSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['field_officer', 'mine_official', 'corporate_manager', 'regulator'] as const),
    siteId: z.string().nullable(),
  })
  .superRefine((values, ctx) => {
    const siteScoped = values.role === 'field_officer' || values.role === 'mine_official';
    if (siteScoped && !values.siteId) {
      ctx.addIssue({ code: 'custom', path: ['siteId'], message: 'Site is required for this role.' });
    }
  });

type UserFormData = z.infer<typeof userSchema>;

const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

export const UsersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isRealMode = !env.USE_MOCK_API;
  const canManage = isRealMode ? user?.role === 'corporate_manager' : true;

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: dashboard } = useDashboardSummary();
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersService.list(),
  });

  // Live site list — corporate dashboard already returns every site (id + name)
  // via the role adapter. Fall back to [] while it loads (or on non-corporate).
  const siteOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of dashboard?.sites ?? []) {
      if (s.siteId && !seen.has(s.siteId)) seen.set(s.siteId, s.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [dashboard]);

  const siteNameById = useMemo(() => new Map(siteOptions.map((s) => [s.value, s.label])), [siteOptions]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'field_officer', siteId: '', password: '' },
  });

  const selectedRole = watch('role');
  const siteScopedRole = selectedRole === 'field_officer' || selectedRole === 'mine_official';

  if (isRealMode && !canManage) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<UsersRound className="w-8 h-8 text-[#8D969B]" />}
          title="Corporate access required"
          description="Only corporate managers can provision user accounts. If you were directed here by mistake, this restriction exists to keep each mine's user list controlled."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Provision platform access (role-based)"
        backgroundImage={usersHeaderImg}
        action={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Add User
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (u: User) => <span className="font-medium text-[#F4F5F5]">{u.name}</span>,
                },
                {
                  key: 'email',
                  header: 'Email',
                  render: (u: User) => <span className="text-[#A4ADB2]">{u.email}</span>,
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (u: User) => (
                    <Badge status={u.role === 'field_officer' ? 'active' : u.role === 'mine_official' ? 'open' : u.role === 'regulator' ? 'info' : 'scheduled'} />
                  ),
                },
                {
                  key: 'siteId',
                  header: 'Site',
                  render: (u: User) => (
                    <span className="text-[#A4ADB2]">
                      {(u.siteId && siteNameById.get(u.siteId)) ?? u.siteId ?? 'All (cross-site)'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (u: User) => <Badge status={u.status} />,
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  render: (u: User) => <span className="text-[#A4ADB2]">{formatDate(u.createdAt)}</span>,
                },
              ]}
              data={users ?? []}
            />
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add User">
        <form
          onSubmit={handleSubmit(async (data) => {
            setIsSubmitting(true);
            setSubmitError(null);
            try {
              await authService.register({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role as UserRole,
                siteId: siteScopedRole && data.siteId ? data.siteId : null,
              });
              setIsOpen(false);
              reset();
              queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            } catch (err: any) {
              setSubmitError(sanitizeErrorMessage(err) ?? 'Failed to create user');
            } finally {
              setIsSubmitting(false);
            }
          })}
          className="space-y-4"
        >
          {submitError && (
            <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
              <p className="text-sm text-[#FF4D4F]">{submitError}</p>
            </div>
          )}
          <Input label="Full name" placeholder="Enter full name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" placeholder="Minimum 6 characters" error={errors.password?.message} {...register('password')} />
          <Select label="Role" options={roleOptions} {...register('role')} />
          <div className="relative">
            <Select
              label="Site"
              options={siteOptions}
              placeholder={siteScopedRole ? 'Select a site' : 'Cross-site (manager / regulator)'}
              error={errors.siteId?.message}
              {...register('siteId')}
            />
            {siteScopedRole && (
              <p className="mt-1 text-xs text-[#8299A7]">
                Field officers and mine officials are bound to the site they work from.
              </p>
            )}
          </div>
          {!siteScopedRole && (
            <p className="text-xs text-[#8299A7]">
              Managers and regulators have cross-site access, so no site is assigned.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} leftIcon={<X className="h-4 w-4" />}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isDirty}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};