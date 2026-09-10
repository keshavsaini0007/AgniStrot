import { useEffect, useRef, useState } from 'react';

interface UseRevealOptions {
  once?: boolean;
  margin?: string;
}

export function useReveal(once: boolean = true, margin = '-60px') {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: margin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once, margin]);

  return { ref, inView };
}

export type { UseRevealOptions };