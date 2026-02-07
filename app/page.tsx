const cards = [
  { label: "Proposte in inbox", value: "12" },
  { label: "Purchase pending payment", value: "2" },
  { label: "Contenuti in queue", value: "30" },
  { label: "MRR (this month)", value: "€1,240" },
  { label: "Burn (this month)", value: "€410" },
  { label: "Runway stimata", value: "3.0 mesi" }
];

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">CEO Console</span>
        <h1>AI Company OS for Emotional Pregnancy</h1>
        <p>
          Operating system con pipeline <strong>Propose - Approve - Execute</strong>, guardrail no-medical,
          publish manuale e sezione Finance con ledger/PnL.
        </p>
      </section>

      <section className="card-grid">
        {cards.map((card) => (
          <article className="card" key={card.label}>
            <h3>{card.label}</h3>
            <p>{card.value}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <span className="badge">Today</span>
        <h2>Operating loop</h2>
        <p>
          Daily cycle attivo: analytics, content batch, compliance check, proposals in inbox. Tutte le azioni
          sensibili restano in attesa di approvazione CEO.
        </p>
      </section>

      <section className="panel">
        <h2>CEO actions</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="button" href="/proposals">
            Open Proposals Inbox
          </a>
          <a className="button" href="/finance">
            Open Finance Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
