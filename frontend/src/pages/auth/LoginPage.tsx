import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
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
      await login(data);
      navigate('/app/dashboard');
    } catch (error) {
      // Error is handled by the auth store
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0E] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#D88A32] flex items-center justify-center">
              <span className="text-white font-bold">SM</span>
            </div>
            <span className="text-lg font-semibold text-[#F4F5F5]">Smart Mine</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F4F5F5] mb-2">Welcome back</h1>
          <p className="text-[#A4ADB2]">Sign in to access the governance platform</p>
        </div>

        <div className="bg-[#111416] border border-[#252A2D] rounded-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-[#FF4D4F]/10 border border-[#FF4D4F]/30 rounded-lg p-3">
                <p className="text-sm text-[#FF4D4F]">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-[#8D969B] hover:text-[#F4F5F5]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#252A2D]">
            <p className="text-sm text-[#8D969B] text-center mb-4">Demo accounts:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#171A1D] rounded-lg p-2 text-center">
                <p className="text-[#A4ADB2]">rahul@coalindia.com</p>
                <p className="text-[#8D969B]">Mine Officer</p>
              </div>
              <div className="bg-[#171A1D] rounded-lg p-2 text-center">
                <p className="text-[#A4ADB2]">admin@coalindia.com</p>
                <p className="text-[#8D969B]">System Admin</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-[#8D969B] mt-6">
          <Link to="/" className="text-[#D88A32] hover:text-[#D88A32]/80">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
};