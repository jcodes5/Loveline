type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeading({ eyebrow, title, action, className }: SectionHeadingProps) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className ?? ""}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">
          {eyebrow}
        </p>
        <h2 className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-foreground">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}