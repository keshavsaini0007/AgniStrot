import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  BarChart3,
  MapPin,
  Bell,
  FileText,
  Users,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: Shield,
    title: 'Compliance Monitoring',
    description: 'Real-time tracking of statutory compliance across all mining operations.',
  },
  {
    icon: BarChart3,
    title: 'AI Risk Intelligence',
    description: 'Predictive risk scoring using historical data and operational patterns.',
  },
  {
    icon: MapPin,
    title: 'GIS Integration',
    description: 'Location-based monitoring with interactive mine maps and risk hotspots.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Automated notifications for deadlines, violations, and high-risk events.',
  },
  {
    icon: FileText,
    title: 'Digital Documentation',
    description: 'Centralized document management with OCR and intelligent classification.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Secure access control with different permissions for different roles.',
  },
];

const workflow = [
  { step: '1', title: 'Field Inspection', description: 'Inspectors record observations with photos and GPS' },
  { step: '2', title: 'AI Analysis', description: 'System analyzes patterns and calculates risk scores' },
  { step: '3', title: 'Smart Alerts', description: 'Automated notifications to responsible officers' },
  { step: '4', title: 'Corrective Action', description: 'Track resolution from assignment to verification' },
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0B0D0E]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0D0E]/80 backdrop-blur-md border-b border-[#252A2D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D88A32] flex items-center justify-center">
                <span className="text-white font-bold text-sm">SM</span>
              </div>
              <span className="text-sm font-semibold text-[#F4F5F5]">Smart Mine Governance</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/login">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#D88A32]/10 border border-[#D88A32]/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-[#D88A32]" />
              <span className="text-sm text-[#D88A32]">AI-Powered Governance</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-[#F4F5F5] mb-6">
              Smarter Compliance.
              <br />
              <span className="text-[#D88A32]">Safer Mines.</span>
              <br />
              Better Governance.
            </h1>
            <p className="text-lg md:text-xl text-[#A4ADB2] max-w-3xl mx-auto mb-8">
              A centralized AI-enabled platform for coal mine governance, compliance monitoring,
              field inspections, and operational intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Start Monitoring
                </Button>
              </Link>
              <Button variant="secondary" size="lg">
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#111416]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#F4F5F5] mb-4">
              Core Capabilities
            </h2>
            <p className="text-[#A4ADB2] max-w-2xl mx-auto">
              Everything you need to monitor, manage, and improve mining operations compliance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#171A1D] border border-[#252A2D] rounded-xl p-6 hover:border-[#D88A32]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#D88A32]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#D88A32]" />
                </div>
                <h3 className="text-lg font-semibold text-[#F4F5F5] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#A4ADB2]">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#F4F5F5] mb-4">
              How It Works
            </h2>
            <p className="text-[#A4ADB2] max-w-2xl mx-auto">
              From field inspection to resolution, complete visibility into every step.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {workflow.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#D88A32] flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#F4F5F5] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#A4ADB2]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#111416]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#F4F5F5] mb-4">
              Impact
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: '118+', label: 'Mines Monitored' },
              { value: '94.2%', label: 'Compliance Rate' },
              { value: '2,500+', label: 'Inspections Completed' },
              { value: '45%', label: 'Faster Resolution' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-[#D88A32] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-[#A4ADB2]">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#D88A32]/10 to-[#D88A32]/5 border border-[#D88A32]/30 rounded-2xl p-12"
          >
            <h2 className="text-3xl font-bold text-[#F4F5F5] mb-4">
              Ready to Transform Mining Governance?
            </h2>
            <p className="text-[#A4ADB2] mb-8 max-w-2xl mx-auto">
              Join the future of coal mine compliance monitoring. Start your journey towards smarter, safer, and more efficient operations.
            </p>
            <Link to="/login">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Get Started Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-[#252A2D]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#D88A32] flex items-center justify-center">
              <span className="text-white font-bold text-xs">SM</span>
            </div>
            <span className="text-sm text-[#8D969B]">Smart Mine Governance System</span>
          </div>
          <div className="text-sm text-[#8D969B]">
            SIH26024 — Ministry of Coal
          </div>
        </div>
      </footer>
    </div>
  );
};