const sample = [
  {
    project: "kick-counter",
    type: "content_batch",
    title: "Kick Counter: 10 video scripts for week 1",
    risk: "low",
    status: "PROPOSED"
  },
  {
    project: "pregnancy-week-snap",
    type: "experiment",
    title: "A/B CTA: save checklist vs share with partner",
    risk: "medium",
    status: "PROPOSED"
  },
  {
    project: "kegel-streak",
    type: "purchase_request",
    title: "Acquire domain kegelroutine.app",
    risk: "high",
    status: "APPROVED_PENDING_PAYMENT"
  }
];

export default function ProposalsPage() {
  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">Inbox</span>
        <h1>Proposals Queue</h1>
        <p>Ogni item sensibile richiede approvazione esplicita del CEO prima dell&apos;esecuzione.</p>
      </section>

      <section className="list">
        {sample.map((row) => (
          <article key={row.title} className="item">
            <strong>{row.title}</strong>
            <div>project: {row.project}</div>
            <div>type: {row.type}</div>
            <div>risk: {row.risk}</div>
            <div>status: {row.status}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
