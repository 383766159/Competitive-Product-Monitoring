import { useId, type ReactNode } from 'react';

type SurfaceCardProps = {
  title?: string;
  description?: string;
  className?: string;
  headerSlot?: ReactNode;
  children: ReactNode;
};

export function SurfaceCard(props: SurfaceCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const className = ['surface-card', 'rounded-2xl', 'p-4', 'md:p-5', props.className]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={className}
      aria-labelledby={props.title ? titleId : undefined}
      aria-describedby={props.description ? descriptionId : undefined}
    >
      {(props.title || props.description || props.headerSlot) && (
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
          <div className="min-w-0">
            {props.title && (
              <h2 id={titleId} className="text-sm font-semibold tracking-[0.02em] text-[var(--text-primary)]">
                {props.title}
              </h2>
            )}
            {props.description && (
              <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {props.description}
              </p>
            )}
          </div>
          {props.headerSlot}
        </header>
      )}
      {props.children}
    </section>
  );
}
