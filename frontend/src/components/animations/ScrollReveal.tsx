import { motion } from 'framer-motion';
import { useReveal } from './useReveal';
import type { Variants } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
  viewportMargin?: string;
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

export const ScrollReveal = ({
  children,
  variants = defaultVariants,
  delay = 0,
  className,
  viewportMargin = '-60px',
}: ScrollRevealProps) => {
  const { ref, inView } = useReveal(true, viewportMargin);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
};