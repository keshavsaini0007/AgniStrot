import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';

interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export const Counter = ({
  from = 0,
  to,
  duration = 2,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const count = useMotionValue(from);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, {
        duration,
        ease: [0.22, 1, 0.36, 1],
      });
      return controls.stop;
    }
  }, [isInView, count, to, duration]);

  const formatted = useTransform(count, (v) => {
    const val = decimals > 0 ? v.toFixed(decimals) : Math.round(v);
    return `${prefix}${val.toLocaleString()}${suffix}`;
  });

  return (
    <motion.span ref={ref} className={className}>
      {formatted}
    </motion.span>
  );
};
