import { useState } from 'react';
import { Save, User, Bell, Shield } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = () => {
    // TODO: Implement settings save
    console.log('Saving settings:', { name, email });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F4F5F5]">Settings</h1>
        <p className="text-[#8D969B]">Manage your account settings</p>
      </div>

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
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-[#F4F5F5]">Email Notifications</p>
                  <p className="text-xs text-[#8D969B]">Receive email notifications</p>
                </div>
                <div className="w-10 h-6 bg-[#35C759] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-[#F4F5F5]">Push Notifications</p>
                  <p className="text-xs text-[#8D969B]">Receive push notifications</p>
                </div>
                <div className="w-10 h-6 bg-[#35C759] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
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
                <p className="text-sm text-[#8D969B]">Department</p>
                <p className="text-[#F4F5F5]">{user?.department || 'Not assigned'}</p>
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