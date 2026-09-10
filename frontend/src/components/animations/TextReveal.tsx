import { motion } from 'framer-motion';
import { useReveal } from './useReveal';

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  wordClassName?: string;
  mode?: 'whileInView' | 'mount';
}

export const TextReveal = ({
  text,
  className = '',
  delay = 0,
  as: Tag = 'span',
  wordClassName = '',
  mode = 'whileInView',
}: TextRevealProps) => {
  const { ref, inView } = useReveal(true, '-40px');
  const active = mode === 'mount' || inView;
  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
          <motion.span
            className={`inline-block ${wordClassName}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={active ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + i * 0.04,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

interface LineRevealProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  mode?: 'whileInView' | 'mount';
}

export const LineReveal = ({
  lines,
  className = '',
  lineClassName = '',
  delay = 0,
  as: Tag = 'span',
  mode = 'whileInView',
}: LineRevealProps) => {
  const { ref, inView } = useReveal(true, '-40px');
  const active = mode === 'mount' || inView;

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            className={`block ${lineClassName}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={active ? { y: '0%', opacity: 1 } : { y: '110%', opacity: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + i * 0.12,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};