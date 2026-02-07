const monthlyRows = [
  { month: "2026-02", revenue: 1240, fees: 42, refunds: 18, opex: 350, net: 830 },
  { month: "2026-01", revenue: 980, fees: 34, refunds: 8, opex: 290, net: 648 }
];

const transactions = [
  { date: "2026-02-06", type: "revenue", amount: 89, category: "Subscriptions", source: "stripe" },
  { date: "2026-02-06", type: "expense", amount: 19, category: "Domain", source: "purchase_request" },
  { date: "2026-02-05", type: "expense", amount: 49, category: "Tools", source: "manual" }
];

export default function FinancePage() {
  return (
    <main className="container">
      <section className="hero">
        <span className="kicker">Finance</span>
        <h1>Ledger & PnL</h1>
        <p>Entrate Stripe, spese manuali/purchase requests e monitoraggio burn/runway in un unico ledger.</p>
      </section>

      <section className="card-grid">
        <article className="card">
          <h3>MRR</h3>
          <p>€1,240</p>
        </article>
        <article className="card">
          <h3>Net Revenue</h3>
          <p>€1,180</p>
        </article>
        <article className="card">
          <h3>Burn</h3>
          <p>€410</p>
        </article>
        <article className="card">
          <h3>Runway</h3>
          <p>3.0 mesi</p>
        </article>
      </section>

      <section className="panel">
        <h2>PnL mensile</h2>
        <div className="list">
          {monthlyRows.map((row) => (
            <article className="item" key={row.month}>
              <strong>{row.month}</strong>
              <div>revenue: €{row.revenue}</div>
              <div>fees: €{row.fees}</div>
              <div>refunds: €{row.refunds}</div>
              <div>opex: €{row.opex}</div>
              <div className="ok">net: €{row.net}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Recent transactions</h2>
        <div className="list">
          {transactions.map((tx, idx) => (
            <article className="item" key={`${tx.date}-${idx}`}>
              <strong>
                {tx.type} · €{tx.amount}
              </strong>
              <div>date: {tx.date}</div>
              <div>category: {tx.category}</div>
              <div>source: {tx.source}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
