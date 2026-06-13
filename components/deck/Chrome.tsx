/* Persistent brand furniture for interior slides: filete, two vertical mono
   labels ("2026" white / "Interactius" warm-grey), and the page number. */
export function Chrome({ page }: { page: number }) {
  return (
    <>
      <div className="rule" />
      <div className="tab">
        <span className="lbl yr">2026</span>
        <span className="lbl nm">Interactius</span>
      </div>
      <div className="pageno">{String(page).padStart(2, '0')}</div>
    </>
  );
}
