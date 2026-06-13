import { Chrome } from '../Chrome';

/* Fixed brand page (ref p.42): budget table + fixed payment conditions.
   Line items are the reference example for now (to be made md-driven later). */
const ITEMS = [
  { label: 'Análisis Heurístico', amount: '3.315 €' },
  { label: 'Benchmark Android/Mobile', amount: '3.770 €' },
  { label: 'Inmersión + gestión', amount: '3.991 €' },
];
const TOTAL = '11.076 €';

const CONDICIONES = [
  'Emisión de factura inicial por el 60% del total del proyecto una vez recibida la orden de compra al inicio del proyecto.',
  'Emisión de factura final por el 40% del total del proyecto una vez realizada la entrega.',
  'Al importe se le añadirá el IVA correspondiente de acuerdo con la legislación vigente.',
  'Cobro de facturas a 30 días, día de pago habitual del cliente.',
  'Esta propuesta económica tiene una validez de tres meses a partir de la fecha de la misma.',
];

export function Budget({ page }: { page: number }) {
  return (
    <div className="frame theme-light budget">
      <div className="whitehalf" />
      <Chrome page={page} />
      <div className="title">Presupuesto</div>
      <div className="table">
        {ITEMS.map((it) => (
          <div className="row" key={it.label}>
            <span>{it.label}</span>
            <span className="amt">{it.amount}</span>
          </div>
        ))}
        <div className="row total">
          <span>Total</span>
          <span className="amt">{TOTAL}</span>
        </div>
      </div>
      <div className="cond">
        <h3>Condiciones</h3>
        {CONDICIONES.map((c, i) => (
          <div className="item" key={i}>
            <div className="dia">◆</div>
            <div className="body">{c}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
