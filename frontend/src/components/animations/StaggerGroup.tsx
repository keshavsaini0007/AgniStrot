import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useReveal } from './useReveal';

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  viewportMargin?: string;
}

const groupVariants = (stagger: number, delayChildren: number): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const StaggerGroup = ({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.1,
  viewportMargin = '-80px',
}: StaggerGroupProps) => {
  const { ref, inView } = useReveal(true, viewportMargin);
  const variants = useMemo(() => groupVariants(stagger, delayChildren), [stagger, delayChildren]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};