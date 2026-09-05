import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative w-full ${sizeClasses[size]} bg-[#111416] border border-[#252A2D] rounded-xl shadow-2xl mx-4`}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#252A2D]">
                <h3 className="text-lg font-semibold text-[#F4F5F5]">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 text-[#8D969B] hover:text-[#F4F5F5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};