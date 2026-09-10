import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export const HorizontalScroll = ({
  children,
  className = '',
}: HorizontalScrollProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-50%']);

  return (
    <div ref={targetRef} className={`relative h-[200vh] ${className}`}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-8 pl-8 lg:pl-16">
          {children}
        </motion.div>
      </div>
    </div>
  );
};
