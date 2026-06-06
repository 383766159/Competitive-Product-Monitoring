import type { ReactNode } from 'react';

type SurfaceCardProps = {
  title?: string;
  description?: string;
  className?: string;
  headerSlot?: ReactNode;
  children: ReactNode;
};

export function SurfaceCard(props: SurfaceCardProps) {
  return (
    <section
      className={`surface-card rounded-[28px] p-5 ${
        props.className ?? ''
      }`}
    >
      {(props.title || props.description || props.headerSlot) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {props.title && <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>}
            {props.description && <p className="mt-1 text-sm text-slate-400">{props.description}</p>}
          </div>
          {props.headerSlot}
        </div>
      )}
      {props.children}
    </section>
  );
}
