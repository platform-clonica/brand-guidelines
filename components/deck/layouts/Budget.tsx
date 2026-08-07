import { Chrome } from '../Chrome';
import { inline } from '../inline';
import type { BudgetItem } from '@/lib/deck';

/* Brand page (ref p.42): budget table + payment conditions.
   Line items, total and conditions come from the .md (`## Presupuesto`);
   an empty block falls back to the reference example (see lib/deck/blocks.ts). */
export function Budget({
  page,
  title,
  items,
  total,
  conditions,
  conditionsLabel,
}: {
  page: number;
  title?: string;
  items: BudgetItem[];
  total?: string;
  conditions: string[];
  conditionsLabel?: string;
}) {
  return (
    <div className="frame theme-light budget">
      <div className="whitehalf" />
      <Chrome page={page} />
      <div className="title">{inline(title ?? 'Presupuesto')}</div>
      {/* Without a total the table has no closing row, so `nototal` drops the hairline
          under the last line item — it only made sense as a separator from the total. */}
      <div className={total ? 'table' : 'table nototal'}>
        {items.map((it, i) => (
          <div className="row" key={`${it.label}-${i}`}>
            <span>{inline(it.label)}</span>
            <span className="amt">{inline(it.amount)}</span>
          </div>
        ))}
        {total && (
          <div className="row total">
            <span>Total</span>
            <span className="amt">{inline(total)}</span>
          </div>
        )}
      </div>
      <div className="cond">
        <h3>{conditionsLabel ?? 'Condiciones'}</h3>
        {conditions.map((c, i) => (
          <div className="item" key={i}>
            <div className="dia">◆</div>
            <div className="body">{inline(c)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
