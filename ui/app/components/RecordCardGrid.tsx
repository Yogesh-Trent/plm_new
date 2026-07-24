import { ImageSquare } from "@phosphor-icons/react";
import type { ReactNode } from "react";

// Generic, reusable card describing one record. A list page maps each item to a
// RecordCard via a small config, so Styles / Colourways / BOMs / POs all share
// the same grid + card look without duplicating layout.
export type RecordCardModel = {
  id: string;
  href?: string;
  imageUrl?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small label/value rows shown in the card body. */
  fields?: Array<{ label: string; value: ReactNode }>;
  /** Rendered top-right (e.g. a status pill / toggle). */
  badge?: ReactNode;
  /** Rendered in the card footer (e.g. open / edit / delete). */
  actions?: ReactNode;
};

export function RecordCardGrid({ cards }: { cards: RecordCardModel[] }) {
  return (
    <div className="record-card-grid">
      {cards.map((card) => (
        <article className="record-card" key={card.id}>
          <div className="record-card-media">
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt="" />
            ) : (
              <ImageSquare size={26} />
            )}
            {card.badge && <div className="record-card-badge">{card.badge}</div>}
          </div>
          <div className="record-card-body">
            <div className="record-card-heading">
              <strong>{card.title}</strong>
              {card.subtitle && <small>{card.subtitle}</small>}
            </div>
            {card.fields && card.fields.length > 0 && (
              <dl className="record-card-fields">
                {card.fields.map((field) => (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {card.actions && (
            <div className="record-card-actions">{card.actions}</div>
          )}
        </article>
      ))}
    </div>
  );
}
