import { useState } from 'react';
import { Plus, X } from 'lucide-react';
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
import { DemoBadge } from '@/components/demo/DemoGate';
import { formatDate } from '@/utils/date';
import { authService } from '@/services/authService';
import { ROLE_CONFIG } from '@/utils/roles';
import { sanitizeErrorMessage } from '@/utils/security';
import type { User, UserRole } from '@/types';
import usersHeaderImg from '../../../assets/images/Users.png';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
  role: z.enum(['field_officer', 'mine_official', 'corporate_manager', 'regulator'] as const),
  siteId: z.string().nullable(),
});

type UserFormData = z.infer<typeof userSchema>;

const roleOptions = (Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

const siteOptions = [
  { value: 'mine-001', label: 'Rajpur Coal Mine' },
  { value: 'mine-002', label: 'Dhanbad Coal Mine' },
  { value: 'mine-003', label: 'Korba Coal Mine' },
  { value: 'mine-004', label: 'Talcher Coal Mine' },
  { value: 'mine-005', label: 'Samleswari Coal Mine' },
];

export const UsersPage = () => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'field_officer', siteId: 'mine-001', password: '' },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Provision platform access (role-based)"
        backgroundImage={usersHeaderImg}
        action={
          <div className="flex items-center gap-3">
            <DemoBadge />
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
              Add User
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (user: User) => <span className="font-medium text-[#F4F5F5]">{user.name}</span>,
              },
              {
                key: 'email',
                header: 'Email',
                render: (user: User) => <span className="text-[#A4ADB2]">{user.email}</span>,
              },
              {
                key: 'role',
                header: 'Role',
                render: (user: User) => {
                  return (
                    <Badge status={user.role === 'field_officer' ? 'active' : user.role === 'mine_official' ? 'open' : user.role === 'regulator' ? 'info' : 'scheduled'} />
                  );
                },
              },
              {
                key: 'siteId',
                header: 'Site',
                render: (user: User) => <span className="text-[#A4ADB2]">{user.siteId ?? 'All (cross-site)'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (user: User) => <Badge status={user.status} />,
              },
              {
                key: 'createdAt',
                header: 'Joined',
                render: (user: User) => <span className="text-[#A4ADB2]">{formatDate(user.createdAt)}</span>,
              },
            ]}
            data={users ?? []}
          />
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add User">
        <form
          onSubmit={handleSubmit(async (data) => {
            setIsSubmitting(true);
            setSubmitError(null);
            try {
              const created = await authService.register({
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role as UserRole,
                siteId: data.siteId,
              });
              setUsers((prev) => [created, ...(prev ?? [])]);
              setIsOpen(false);
              reset();
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
            <Select label="Site (for field & mine roles)" options={siteOptions} placeholder="Cross-site (manager / regulator)" {...register('siteId')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} leftIcon={<X className="h-4 w-4" />}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};