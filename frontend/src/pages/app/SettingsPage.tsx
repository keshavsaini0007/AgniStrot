import { useState } from 'react';
import { Save, User, Bell, Shield } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import settingsHeaderImg from '../../../assets/images/settings.png';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSave = async () => {
    try {
      // TODO: Implement settings save
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agnistrot_token')}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // TODO: Show success toast
      alert('Profile updated successfully!');
    } catch (error) {
      // TODO: Show error toast
      alert('Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings"
        backgroundImage={settingsHeaderImg}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#D88A32]" />
                <h3 className="text-lg font-semibold text-[#F4F5F5]">Profile</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#4DA3FF]" />
                <h3 className="text-lg font-semibold text-[#F4F5F5]">Notifications</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleSwitch
                checked={emailNotifications}
                onChange={setEmailNotifications}
                label="Email Notifications"
                description="Receive email notifications"
              />
              <ToggleSwitch
                checked={pushNotifications}
                onChange={setPushNotifications}
                label="Push Notifications"
                description="Receive push notifications"
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FF4D4F]" />
                <h3 className="text-lg font-semibold text-[#F4F5F5]">Account</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-2">
                <p className="text-sm text-[#8D969B]">Role</p>
                <p className="text-[#F4F5F5] capitalize">
                  {user?.role?.replace('_', ' ') || 'Unknown'}
                </p>
              </div>
              <div className="py-2">
                <p className="text-sm text-[#8D969B]">Site</p>
                <p className="text-[#F4F5F5]">{user?.siteId ?? 'Cross-site (manager / regulator)'}</p>
              </div>
              <Button variant="danger" className="w-full">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
