"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, Lead } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const data = await apiRequest<Lead[]>("/leads");
      setLeads(data);
    } catch (e) {
      console.error("Erro ao carregar leads:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await apiRequest("/leads", {
        method: "POST",
        body: JSON.stringify({
          organizationId: "00000000-0000-0000-0000-000000000001",
          pipelineId: "00000000-0000-0000-0000-000000000002",
          stageId: "00000000-0000-0000-0000-000000000003",
          title: newTitle,
        }),
      });
      setNewTitle("");
      loadLeads();
    } catch (e) {
      console.error("Erro ao criar lead:", e);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const openLeads = leads.filter((l) => l.status === "open");
  const wonLeads = leads.filter((l) => l.status === "won");
  const lostLeads = leads.filter((l) => l.status === "lost");

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          <p className="text-sm text-gray-600">Gerencie seu funil de vendas</p>
        </div>
        <Button
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("new-title")?.focus();
          }}
        >
          + Novo Lead
        </Button>
      </div>

      <form onSubmit={createLead} className="mb-6">
        <div className="flex gap-2">
          <Input
            id="new-title"
            label="Título do lead"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Venda para Acme Corp"
          />
          <Button type="submit">Adicionar</Button>
        </div>
      </form>

      <div className="flex gap-4">
        <Column
          title="Aberto"
          status="open"
          leads={openLeads}
          color="border-blue-200"
        />
        <Column
          title="Ganho"
          status="won"
          leads={wonLeads}
          color="border-green-200"
        />
        <Column
          title="Perdido"
          status="lost"
          leads={lostLeads}
          color="border-red-200"
        />
      </div>
    </div>
  );
}

function Column({
  title,
  status,
  leads,
  color,
}: {
  title: string;
  status: string;
  leads: Lead[];
  color: string;
}) {
  return (
    <div className="flex-1 w-80 flex flex-col border rounded-lg p-4 bg-white" style={{ borderColor: color }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}>
          {leads.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 min-h-[200px]">
        {leads.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">
            Sem leads
          </div>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="border-blue-100 p-3">
              <CardHeader>
                <CardTitle className="text-base">{lead.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {lead.valueCents ? `R$ ${(lead.valueCents / 100).toFixed(2)}` : "Sem valor"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-bold ${STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
