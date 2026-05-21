export default function EnterpriseModulePage({
  description,
  eyebrow = 'Blue Horizon Module',
  metrics = [],
  title,
}) {
  return (
    <div className="enterprise-module-page">
      <section className="enterprise-module-hero">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      {metrics.length > 0 && (
        <section className="enterprise-module-grid" aria-label={`${title} overview`}>
          {metrics.map((metric) => (
            <article key={metric.label} className="enterprise-module-card">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
