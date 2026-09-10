import { motion } from 'framer-motion';
import { useReveal } from './useReveal';

interface ImageRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  mode?: 'whileInView' | 'mount';
}

const clipPaths: Record<string, { hidden: string; visible: string }> = {
  left: { hidden: 'inset(0 100% 0 0)', visible: 'inset(0 0% 0 0)' },
  right: { hidden: 'inset(0 0 0 100%)', visible: 'inset(0 0 0 0%)' },
  up: { hidden: 'inset(100% 0 0 0)', visible: 'inset(0% 0 0 0)' },
  down: { hidden: 'inset(0 0 100% 0)', visible: 'inset(0 0 0% 0)' },
};

type RevealTarget = { clipPath: string; scale: number };

export const ImageReveal = ({
  children,
  className = '',
  delay = 0,
  direction = 'left',
  mode = 'whileInView',
}: ImageRevealProps) => {
  const { ref, inView } = useReveal(true, '-60px');
  const active = mode === 'mount' || inView;
  const { hidden, visible } = clipPaths[direction];

  return (
    <div ref={ref} className={`overflow-hidden ${className}`} style={{ clipPath: active ? undefined : 'none' }}>
      <motion.div
        initial={{ clipPath: hidden, scale: 1.08 }}
        animate={active ? ({ clipPath: visible, scale: 1 } satisfies RevealTarget) : ({ clipPath: hidden, scale: 1.08 } satisfies RevealTarget)}
        transition={{
          clipPath: { duration: 1, ease: [0.22, 1, 0.36, 1], delay },
          scale: { duration: 1.3, ease: [0.22, 1, 0.36, 1], delay },
        }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
};