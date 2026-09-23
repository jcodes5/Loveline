import { motion, useReducedMotion } from "framer-motion";

type HeartBeatProps = {
  children: React.ReactNode;
  className?: string;
  play?: boolean;
};

export function HeartBeat({ children, className, play = true }: HeartBeatProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      className={className}
      initial={play ? { scale: 0.6, opacity: 0 } : false}
      animate={play ? { scale: [0.6, 1.3, 1], opacity: [0, 1, 1] } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.55, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}
