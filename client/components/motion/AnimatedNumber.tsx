import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  duration?: number;
  format?: (value: number) => string;
};

export function AnimatedNumber({ value, className, duration = 1200, format }: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const started = useRef(false);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const node = nodeRef.current;
    if (!node) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration, reduced]);

  return (
    <motion.span ref={nodeRef} className={className}>
      {format ? format(display) : display.toLocaleString()}
    </motion.span>
  );
}
