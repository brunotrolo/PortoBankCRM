export default function Page() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="border-b px-6 py-4 bg-background">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-xl text-primary">
            Porto Bank CRM
          </a>
          <nav className="ml-auto flex items-center gap-4">
            <a href="/kanban" className="text-sm font-medium hover:text-primary">
              Kanban
            </a>
            <a href="/contatos" className="text-sm font-medium hover:text-primary">
              Contatos
            </a>
            <a href="/ia" className="text-sm font-medium hover:text-primary">
              Agente IA
            </a>
          </nav>
        </div>
      </nav>

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Bem-vindo ao Porto Bank CRM</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Leads no pipeline" value="142" subtitle="+12 esta semana" />
          <Card title="Conversas ativas" value="23" subtitle="5 aguardando resposta" />
          <Card title="Agentes IA" value="3" subtitle="Orçamento: 85% usado" />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Funil de Vendas</h2>
          <div className="border rounded-lg p-4 bg-muted/50">
            <p className="text-muted-foreground">
              Kanban interativo em desenvolvimento — conectando com API /api/v1/leads
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
