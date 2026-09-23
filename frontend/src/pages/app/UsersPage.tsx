import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X, UsersRound, Download } from 'lucide-react';
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
import { FilterBar } from '@/components/ui/FilterBar';
import { env } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useUpdateUser, useUsers } from '@/hooks/useUsers';
import { queryKeys } from '@/hooks/useMines';
import { authService } from '@/services/authService';
import { exportService } from '@/services/exportService';
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

// Manage modal (feature 07) — name/role/site/status. Email is immutable, so it
// is displayed read-only and never submitted.
const editUserSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['field_officer', 'mine_official', 'corporate_manager', 'regulator'] as const),
    siteId: z.string().nullable(),
    status: z.enum(['active', 'inactive'] as const),
  })
  .superRefine((values, ctx) => {
    const siteScoped = values.role === 'field_officer' || values.role === 'mine_official';
    if (siteScoped && !values.siteId) {
      ctx.addIssue({ code: 'custom', path: ['siteId'], message: 'Site is required for this role.' });
    }
  });

type EditUserFormData = z.infer<typeof editUserSchema>;

const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

const roleFilterOptions = [{ value: '', label: 'All roles' }, ...roleOptions];
const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const UsersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isRealMode = !env.USE_MOCK_API;
  const canManage = isRealMode ? user?.role === 'corporate_manager' : true;

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Feature 09 — register CSV export (corporate-only endpoint).
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await exportService.downloadUsersCsv();
      downloadBlob(blob, 'users-register.csv');
    } catch (err) {
      setExportError(sanitizeErrorMessage(err instanceof Error ? err.message : 'Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const { data: dashboard } = useDashboardSummary();

  // Server-side filters (feature 07) — empty values are omitted by the repos.
  const listParams = useMemo(
    () => ({
      ...(roleFilter ? { role: roleFilter as UserRole } : {}),
      ...(statusFilter ? { status: statusFilter as 'active' | 'inactive' } : {}),
    }),
    [roleFilter, statusFilter]
  );
  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useUsers(listParams);
  const updateUser = useUpdateUser();

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

  // ── Add-user form ─────────────────────────────────────────────────────────
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

  // ── Manage-user form (feature 07) ─────────────────────────────────────────
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors, isDirty: editIsDirty },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  const editSelectedRole = watchEdit('role');
  const editSiteScopedRole = editSelectedRole === 'field_officer' || editSelectedRole === 'mine_official';

  const openManage = (u: User) => {
    resetEdit({ name: u.name, role: u.role, siteId: u.siteId ?? '', status: u.status });
    setEditError(null);
    setEditingUser(u);
  };

  const onSubmitEdit = handleEditSubmit(async (data) => {
    if (!editingUser) return;
    setIsEditSubmitting(true);
    setEditError(null);
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        input: {
          name: data.name,
          role: data.role,
          siteId: editSiteScopedRole && data.siteId ? data.siteId : null,
          status: data.status,
        },
      });
      setEditingUser(null);
    } catch (err: any) {
      setEditError(sanitizeErrorMessage(err) ?? 'Failed to update user');
    } finally {
      setIsEditSubmitting(false);
    }
  });

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
          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="export-users-csv"
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
              Add User
            </Button>
          </div>
        }
      />

      {exportError && (
        <div
          data-testid="export-error"
          className="rounded-lg border border-[#FF4D4F]/40 bg-[#FF4D4F]/10 px-4 py-3 text-sm text-[#FFB3B5]"
        >
          {exportError}
        </div>
      )}

      <FilterBar>
        <div className="w-full sm:w-56">
          <Select
            data-testid="role-filter"
            compact
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            data-testid="status-filter"
            compact
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </FilterBar>

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
                    <span className="text-[#E8F0F3]">{ROLE_CONFIG[u.role]?.label ?? u.role}</span>
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
                  render: (u: User) => (
                    <span data-testid={`user-status-${u.id}`}>
                      <Badge status={u.status} />
                    </span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  render: (u: User) => <span className="text-[#A4ADB2]">{formatDate(u.createdAt)}</span>,
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (u: User) =>
                    user?.id === u.id ? (
                      <span className="text-xs text-[#5F6B72]">You</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`manage-user-${u.id}`}
                        onClick={() => openManage(u)}
                      >
                        Manage
                      </Button>
                    ),
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

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Manage User">
        <form data-testid="user-manage-form" onSubmit={onSubmitEdit} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
              <p className="text-sm text-[#FF4D4F]">{editError}</p>
            </div>
          )}
          {editingUser && (
            <p className="text-xs text-[#8299A7]">
              Email is immutable — <span className="text-[#A4ADB2]">{editingUser.email}</span> cannot be changed.
            </p>
          )}
          <Input data-testid="edit-name" label="Full name" error={editErrors.name?.message} {...registerEdit('name')} />
          <Select data-testid="edit-role" label="Role" options={roleOptions} error={editErrors.role?.message} {...registerEdit('role')} />
          <div className="relative">
            <Select
              data-testid="edit-site"
              label="Site"
              options={siteOptions}
              placeholder={editSiteScopedRole ? 'Select a site' : 'Cross-site (manager / regulator)'}
              error={editErrors.siteId?.message}
              {...registerEdit('siteId')}
            />
            {editSiteScopedRole && (
              <p className="mt-1 text-xs text-[#8299A7]">
                Field officers and mine officials are bound to the site they work from.
              </p>
            )}
          </div>
          <Select
            data-testid="edit-status"
            label="Status"
            options={statusFilterOptions.slice(1)}
            error={editErrors.status?.message}
            {...registerEdit('status')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} leftIcon={<X className="h-4 w-4" />}>
              Cancel
            </Button>
            <Button type="submit" data-testid="save-user-edit" variant="primary" isLoading={isEditSubmitting} disabled={!editIsDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};