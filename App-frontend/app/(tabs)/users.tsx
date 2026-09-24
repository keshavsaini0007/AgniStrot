import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useUsers, useUpdateUser } from '@/hooks/useUsers';
import { useSites } from '@/hooks/useSites';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  Badge,
  LoadingState,
  EmptyState,
  Button,
  TextInput,
  ChoiceChips,
  PngIcon,
  type PngIconName,
} from '@/components/ui';
import { AppNavbar } from '@/components/AppNavbar';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { getRoleConfig } from '@/utils/roles';
import type { User, UserRole } from '@/types';

const ROLE_ICONS: Record<string, PngIconName> = {
  // Backend vocabulary (live directory)
  mine_official: 'mine',
  corporate_manager: 'star',
  regulator: 'landmark',
  field_officer: 'inspection',
  // Legacy demo roles (mock database)
  system_admin: 'key',
  mine_officer: 'mine',
  field_inspector: 'inspection',
  department_officer: 'briefcase',
  contractor: 'travel',
  corporate_management: 'star',
  regulatory_authority: 'landmark',
  auditor: 'search',
};

// Backend role vocabulary only — these are the roles the directory accepts.
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'mine_official', label: 'Mine Official' },
  { value: 'corporate_manager', label: 'Corporate Manager' },
  { value: 'regulator', label: 'Regulator' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SITE_SCOPED_ROLES: readonly UserRole[] = ['field_officer', 'mine_official'];

export default function UsersScreen() {
  const theme = useTheme();
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useUsers();
  const { data: sitesData } = useSites();
  const updateUser = useUpdateUser();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('field_officer');
  const [editSite, setEditSite] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const siteOptions = useMemo(
    () =>
      (sitesData ?? []).map((s) => ({
        value: s.siteId,
        label: s.name,
      })),
    [sitesData]
  );

  const siteNameById = useMemo(
    () => new Map((sitesData ?? []).map((s) => [s.siteId, s.name])),
    [sitesData]
  );

  const openManage = (u: User) => {
    setEditName(u.name);
    setEditRole(u.role as UserRole);
    setEditSite(u.siteId ?? '');
    setEditStatus(u.status === 'inactive' ? 'inactive' : 'active');
    setEditError(null);
    setEditingUser(u);
  };

  const closeManage = () => {
    if (isSaving) return;
    setEditingUser(null);
  };

  const isSiteScoped = SITE_SCOPED_ROLES.includes(editRole);

  const onSave = async () => {
    if (!editingUser) return;
    if (isSiteScoped && !editSite) {
      setEditError('A site is required for field officers and mine officials.');
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        input: {
          name: editName,
          role: editRole,
          siteId: isSiteScoped ? editSite : null,
          status: editStatus,
        },
      });
      setEditingUser(null);
    } catch (err: any) {
      setEditError(
        err?.message || (err instanceof Error ? err.message : 'Failed to update user.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isCorporateGate = currentUser?.role !== 'corporate_manager';

  const renderUser = ({ item }: { item: User }) => {
    const roleCfg = getRoleConfig(item.role as UserRole);
    const myRow = currentUser?.id === item.id;
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
          </View>
          {myRow ? (
            <Badge label="You" color={theme.textSecondary} backgroundColor={theme.surfaceElevated} size="sm" />
          ) : (
            <Button
              title="Manage"
              variant="ghost"
              size="sm"
              onPress={() => openManage(item)}
              testID={`manage-user-${item.id}`}
            />
          )}
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.roleRow}>
            <PngIcon name={ROLE_ICONS[item.role] ?? 'user-check'} size={16} />
            <Badge label={roleCfg.label} color={roleCfg.color} backgroundColor={roleCfg.bg} size="sm" />
          </View>
          {item.siteId ? (
            <Badge
              label={siteNameById.get(item.siteId) ?? item.siteId.slice(-4).toUpperCase()}
              color={theme.textSecondary}
              backgroundColor={theme.surfaceElevated}
              size="sm"
            />
          ) : (
            <Badge label="Cross-site" color={theme.textSecondary} backgroundColor={theme.surfaceElevated} size="sm" />
          )}
          <Badge
            label={item.status}
            color={item.status === 'active' ? '#35C759' : '#8D969B'}
            backgroundColor={item.status === 'active' ? 'rgba(53,199,89,0.15)' : 'rgba(141,150,155,0.15)'}
            size="sm"
          />
        </View>
      </Card>
    );
  };

  if (isLoading) return <LoadingState message="Loading users..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <AppNavbar />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: theme.text }]}>Users</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{data?.meta.total || 0} users</Text>
      </View>

      {isCorporateGate ? (
        <EmptyState
          title="Corporate access required"
          icon="user-check"
          description="Only corporate managers can manage user accounts."
        />
      ) : (
        <FlatList
          data={data?.data || []}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState title="No users found" icon="user-check" />}
        />
      )}

      {/* ── Feature 07: manage user modal ─────────────────────────────────── */}
      <Modal
        visible={!!editingUser}
        transparent
        animationType="slide"
        onRequestClose={closeManage}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeManage}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surface }]}
            onPress={() => {}}
            testID="user-manage-form"
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Manage User</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {editingUser?.email} — email is immutable
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {editError && (
                <View style={[styles.errorBox, { borderColor: '#FF4D4F40', backgroundColor: 'rgba(255,77,79,0.1)' }]}>
                  <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{editError}</Text>
                </View>
              )}
              <TextInput label="Full name" value={editName} onChangeText={setEditName} placeholder="Full name" testID="edit-name" />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Role</Text>
              <ChoiceChips
                options={ROLE_OPTIONS}
                value={editRole}
                onChange={(v) => setEditRole(v as UserRole)}
              />
              {isSiteScoped ? (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Site</Text>
                  <ChoiceChips
                    options={siteOptions}
                    value={editSite}
                    onChange={setEditSite}
                    size="sm"
                  />
                  <Text style={[styles.hint, { color: theme.textMuted }]}>
                    Field officers and mine officials are bound to the site they work from.
                  </Text>
                </>
              ) : (
                <Text style={[styles.hint, { color: theme.textMuted }]}>
                  Managers and regulators have cross-site access — no site is assigned.
                </Text>
              )}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Status</Text>
              <ChoiceChips
                options={STATUS_OPTIONS}
                value={editStatus}
                onChange={(v) => setEditStatus(v as 'active' | 'inactive')}
              />
              {isSiteScoped && !editSite && (
                <Text style={[styles.hint, { color: '#FF4D4F' }]}>
                  Select a site for this role before saving.
                </Text>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button title="Cancel" variant="ghost" onPress={closeManage} disabled={isSaving} testID="edit-user-cancel" />
              <Button title="Save changes" variant="primary" loading={isSaving} onPress={onSave} testID="edit-user-save" />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.one },
  title: { fontSize: FontSize.xxl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.three, paddingTop: Spacing.three },
  card: { gap: Spacing.three },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: FontSize.md, fontWeight: '600' },
  userEmail: { fontSize: FontSize.sm },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingTop: Spacing.five,
  },
  modalHeader: { paddingHorizontal: Spacing.five, gap: Spacing.one },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  modalSubtitle: { fontSize: FontSize.sm },
  modalBody: { padding: Spacing.five, gap: Spacing.three },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    padding: Spacing.five,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '500' },
  hint: { fontSize: FontSize.xs, lineHeight: 16 },
  errorBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  errorText: { fontSize: FontSize.sm },
});