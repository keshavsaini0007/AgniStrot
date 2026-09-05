import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className = '', hover = false, onClick }: CardProps) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={`bg-[#111416] border border-[#252A2D] rounded-xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`px-6 py-4 border-b border-[#252A2D] ${className}`}>
      {children}
    </div>
  );
};

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`px-6 py-4 border-t border-[#252A2D] ${className}`}>
      {children}
    </div>
  );
};