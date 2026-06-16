// supabase/functions/rmm-sync/index.ts
// Edge Function: Sincroniza dados do Tactical RMM → Supabase (ativos)
// Deploy: supabase functions deploy rmm-sync
// Secrets:
//   supabase secrets set TACTICAL_RMM_URL=https://api.nk3it.com.br
//   supabase secrets set TACTICAL_RMM_API_KEY=sua-chave-aqui

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RMMAgent {
  agent_id: string;
  hostname: string;
  operating_system: string;
  plat: string;
  total_ram: number;
  cpu_model: string[];
  disks: Record<string, { total: string; free: string; device: string; fstype: string }>;
  serial_number: string;
  make_model: string;
  last_seen: string;
  status: string;
  client: string;
  site: string;
  [key: string]: unknown;
}

interface SyncResult {
  synced: Array<{ patrimonio: string; hostname: string; fields_updated: string[] }>;
  not_found: Array<{ hostname: string; serial: string }>;
  errors: Array<{ hostname: string; error: string }>;
  total_agents: number;
  total_synced: number;
  total_not_found: number;
  client_name: string;
  all_rmm_hostnames: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verificar autenticação ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com credenciais do usuário
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar se o usuário é admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar role admin
    const { data: perfil } = await userClient
      .from("perfis")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!perfil || perfil.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem sincronizar com o RMM" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Buscar agentes no Tactical RMM ──────────────────────
    const rmmUrl = Deno.env.get("TACTICAL_RMM_URL");
    const rmmApiKey = Deno.env.get("TACTICAL_RMM_API_KEY");

    if (!rmmUrl || !rmmApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do RMM ausente. Configure TACTICAL_RMM_URL e TACTICAL_RMM_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rmmResponse = await fetch(`${rmmUrl}/agents/`, {
      method: "GET",
      headers: {
        "X-API-KEY": rmmApiKey,
        "Content-Type": "application/json",
      },
    });

    if (!rmmResponse.ok) {
      const errorText = await rmmResponse.text();
      return new Response(
        JSON.stringify({
          error: `Erro ao conectar com o RMM (HTTP ${rmmResponse.status})`,
          detail: errorText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agents: RMMAgent[] = await rmmResponse.json();

    // ── 2b. Filtrar por cliente do RMM ─────────────────────────
    let clientFilter = "Quero Passagem"; // Padrão
    try {
      const body = await req.json();
      if (body.client_filter) {
        clientFilter = body.client_filter;
      }
    } catch (_) {
      // Body vazio ou inválido → usa padrão
    }

    // Debug: capturar campos do primeiro agente para diagnosticar
    const debugSample = agents.length > 0
      ? {
          client: (agents[0] as Record<string, unknown>).client,
          client_name: (agents[0] as Record<string, unknown>).client_name,
          site: (agents[0] as Record<string, unknown>).site,
          site_name: (agents[0] as Record<string, unknown>).site_name,
          hostname: agents[0].hostname,
        }
      : null;

    // Buscar o nome do cliente em múltiplos campos possíveis da API
    const getClientName = (agent: RMMAgent): string => {
      const a = agent as Record<string, unknown>;
      return (
        String(a.client_name || "") ||
        String(a.client || "") ||
        String(a.site_name || "") ||
        ""
      ).trim();
    };

    const filterLower = clientFilter.trim().toLowerCase();
    const filteredAgents = clientFilter
      ? agents.filter((a) => {
          const name = getClientName(a).toLowerCase();
          return name === filterLower;
        })
      : agents;

    // ── 3. Processar cada agente e atualizar Supabase ──────────
    // Usar service role para bypass de RLS (a função já verificou que é admin)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Coletar todos os nomes de clientes únicos para debug
    const allClientNames = [...new Set(agents.map((a) => getClientName(a)).filter(Boolean))];

    const result = {
      synced: [] as Array<{ patrimonio: string; hostname: string; fields_updated: string[] }>,
      not_found: [] as Array<{ hostname: string; serial: string }>,
      errors: [] as Array<{ hostname: string; error: string }>,
      total_agents: filteredAgents.length,
      total_synced: 0,
      total_not_found: 0,
      client_name: clientFilter,
      all_rmm_hostnames: filteredAgents.map((a) => a.hostname || "").filter(Boolean),
      debug_sample: debugSample,
      debug_all_clients: allClientNames,
      debug_total_before_filter: agents.length,
    };

    for (const agent of filteredAgents) {
      try {
        const hostname = (agent.hostname || "").trim();
        if (!hostname) continue;

        // Cast para acessar campos dinamicamente
        const raw = agent as Record<string, unknown>;

        // Buscar ativo pelo patrimônio (= hostname do RMM)
        const { data: ativos, error: searchError } = await adminClient
          .from("ativos")
          .select("id, patrimonio, proc, ram, disco, so, serie, marca, modelo")
          .ilike("patrimonio", hostname);

        if (searchError) {
          result.errors.push({ hostname, error: searchError.message });
          continue;
        }

        if (!ativos || ativos.length === 0) {
          result.not_found.push({
            hostname,
            serial: String(raw.serial_number || raw.serialnumber || ""),
          });
          result.total_not_found++;
          continue;
        }

        // Extrair dados do agente RMM — tentar múltiplos nomes de campo
        const updatePayload: Record<string, string> = {};
        const fieldsUpdated: string[] = [];
        const rawExtracted: Record<string, unknown> = {};

        // Processador — tentar: cpu_model (array), cpu_model (string), processor, cpu
        let cpuStr = "";
        if (Array.isArray(raw.cpu_model) && raw.cpu_model.length > 0) {
          cpuStr = String(raw.cpu_model[0]);
        } else if (typeof raw.cpu_model === "string" && raw.cpu_model) {
          cpuStr = raw.cpu_model;
        } else if (raw.processor) {
          cpuStr = String(raw.processor);
        } else if (raw.cpu) {
          cpuStr = String(raw.cpu);
        }
        rawExtracted.cpu = cpuStr || raw.cpu_model || raw.processor || raw.cpu;
        if (cpuStr) {
          updatePayload.proc = cpuStr;
          fieldsUpdated.push("proc");
        }

        // ─── Tentar buscar os detalhes individuais do agente se a RAM não estiver na lista ───
        let agentDetails: Record<string, unknown> | null = null;
        if (!raw.total_ram && !raw.ram && !raw.memory && raw.agent_id) {
          try {
            const detailsRes = await fetch(`${rmmUrl}/agents/${raw.agent_id}/`, {
              method: "GET",
              headers: {
                "X-API-KEY": rmmApiKey,
                "Content-Type": "application/json",
              },
            });
            if (detailsRes.ok) {
              agentDetails = await detailsRes.json();
            }
          } catch (_) {
            // Falha silenciosa se não conseguir buscar os detalhes
          }
        }

        // Usar detalhes adicionais se disponíveis
        const fullRaw = agentDetails ? { ...raw, ...agentDetails } : raw;

        // RAM — tentar: total_ram (número em GB), ram, memory, physical_memory
        let ramVal = 0;
        let ramStr = "";
        for (const field of ["total_ram", "ram", "memory", "physical_memory"]) {
          if (fullRaw[field] !== undefined && fullRaw[field] !== null) {
            const val = Number(fullRaw[field]);
            if (!isNaN(val) && val > 0) {
              ramVal = val;
              break;
            } else if (typeof fullRaw[field] === "string" && String(fullRaw[field]).trim()) {
              ramStr = String(fullRaw[field]).trim();
              break;
            }
          }
        }
        rawExtracted.ram = fullRaw.total_ram ?? fullRaw.ram ?? fullRaw.memory;
        if (ramVal > 0) {
          updatePayload.ram = `${ramVal} GB`;
          fieldsUpdated.push("ram");
        } else if (ramStr) {
          updatePayload.ram = ramStr;
          fieldsUpdated.push("ram");
        }

        // Disco — tentar: disks, physical_disks, storage
        let discoStr = "";
        let diskPercent = "";
        const diskSource = fullRaw.physical_disks || fullRaw.disks;
        if (diskSource && typeof diskSource === "object") {
          const diskObj = diskSource as Record<string, Record<string, string>>;
          const diskEntries = Array.isArray(diskSource) ? diskSource : Object.values(diskObj);
          const diskParts: string[] = [];
          
          for (const disk of diskEntries) {
            if (disk && typeof disk === "object") {
              const d = disk as Record<string, unknown>;
              // physical_disks costuma ter 'size' (formato "476 GB" ou bytes), disks costuma ter 'total'
              const total = String(d.total || d.size || d.capacity || "").trim();
              if (total) {
                // Se já contiver "GB" ou "TB" na string, pode usar direto ou tentar parsear
                if (total.toUpperCase().includes("GB") || total.toUpperCase().includes("TB")) {
                  const fsType = d.fstype ? ` (${d.fstype})` : "";
                  diskParts.push(`${total}${fsType}`);
                } else {
                  // Tentar parse como número (pode ser bytes ou GB)
                  const totalNum = parseFloat(total);
                  if (!isNaN(totalNum) && totalNum > 0) {
                    // Se for um número muito grande, assumir bytes (ex: > 1000000)
                    let totalGB = totalNum;
                    if (totalNum > 1000000) {
                      totalGB = totalNum / (1024 * 1024 * 1024);
                    }
                    if (totalGB > 0) {
                      const fsType = d.fstype ? ` (${d.fstype})` : "";
                      diskParts.push(`${totalGB.toFixed(0)} GB${fsType}`);
                    }
                  }
                }
              }
              
              // Extrair porcentagem de uso do disco (geralmente do disco C: ou o primeiro disco)
              if (!diskPercent) {
                if (d.percent !== undefined) {
                  diskPercent = String(d.percent);
                } else if (d.free && d.total) {
                  const free = parseFloat(String(d.free));
                  const tot = parseFloat(String(d.total));
                  if (!isNaN(free) && !isNaN(tot) && tot > 0) {
                    const used = tot - free;
                    diskPercent = Math.round((used / tot) * 100).toString();
                  }
                }
              }
            }
          }
          if (diskParts.length > 0) discoStr = diskParts.join(" + ");
        }
        rawExtracted.disks = fullRaw.physical_disks || fullRaw.disks;
        if (discoStr) {
          updatePayload.disco = discoStr;
          fieldsUpdated.push("disco");
        }
        if (diskPercent) {
          updatePayload.rmm_disk_percent = diskPercent;
          fieldsUpdated.push("rmm_disk_percent");
        }

        // Sistema Operacional — tentar: operating_system, os, platform
        const osStr = String(raw.operating_system || raw.os || "").trim();
        rawExtracted.os = raw.operating_system || raw.os;
        if (osStr) {
          updatePayload.so = osStr;
          fieldsUpdated.push("so");
        }

        // Número de série (preencher se vazio no inventário)
        const serialStr = String(raw.serial_number || raw.serialnumber || "").trim();
        rawExtracted.serial = serialStr;
        if (serialStr) {
          const ativo = ativos[0];
          if (!ativo.serie || ativo.serie.trim() === "") {
            updatePayload.serie = serialStr;
            fieldsUpdated.push("serie");
          }
        }

        // Marca e Modelo
        const makeModel = String(raw.make_model || raw.make || "").trim();
        rawExtracted.make_model = makeModel;
        if (makeModel) {
          const ativo = ativos[0];
          const knownBrands = [
            "Dell Inc.", "Dell", "LENOVO", "Lenovo", "HP", "Hewlett-Packard",
            "ASUS", "Acer", "Samsung", "Microsoft", "Apple", "Positivo",
            "Multilaser", "Vaio", "MSI", "Gigabyte", "Intel"
          ];
          let brand = "";
          let model = makeModel;
          for (const b of knownBrands) {
            if (makeModel.toUpperCase().startsWith(b.toUpperCase())) {
              brand = b.replace(" Inc.", "").trim();
              model = makeModel.substring(b.length).trim();
              break;
            }
          }
          if (!ativo.marca || ativo.marca.trim() === "") {
            if (brand) { updatePayload.marca = brand; fieldsUpdated.push("marca"); }
          }
          if (!ativo.modelo || ativo.modelo.trim() === "") {
            if (model) { updatePayload.modelo = model; fieldsUpdated.push("modelo"); }
          }
        }

        // Telemetria Adicional: Status, Last Seen, Memória
        if (raw.status) {
          updatePayload.rmm_status = String(raw.status);
          fieldsUpdated.push("rmm_status");
        }
        if (raw.last_seen) {
          updatePayload.rmm_last_seen = String(raw.last_seen);
          fieldsUpdated.push("rmm_last_seen");
        }
        
        // Memória em uso
        let memPercent = "";
        if (fullRaw.memory_usage !== undefined) {
          memPercent = String(fullRaw.memory_usage);
        } else if (fullRaw.mem_percent !== undefined) {
          memPercent = String(fullRaw.mem_percent);
        } else if (fullRaw.wmi && typeof fullRaw.wmi === "object") {
          const wmi = fullRaw.wmi as Record<string, unknown>;
          if (wmi.mem_percent) memPercent = String(wmi.mem_percent);
        }
        if (memPercent) {
          updatePayload.rmm_mem_percent = memPercent;
          fieldsUpdated.push("rmm_mem_percent");
        }

        // Atualizar no Supabase se houver campos para atualizar
        if (Object.keys(updatePayload).length > 0) {
          for (const ativo of ativos) {
            const { error: updateError } = await adminClient
              .from("ativos")
              .update(updatePayload)
              .eq("id", ativo.id);

            if (updateError) {
              result.errors.push({ hostname, error: updateError.message });
            } else {
              result.synced.push({
                patrimonio: ativo.patrimonio,
                hostname,
                fields_updated: fieldsUpdated,
              });
              result.total_synced++;
            }
          }
        } else {
          // Nenhum campo para atualizar — reportar como não encontrado com debug
          result.not_found.push({
            hostname,
            serial: serialStr || "(sem campos para atualizar)",
          });
          result.total_not_found++;
        }

        // Guardar dados raw do primeiro agente processado para debug
        if (!result.debug_first_agent_raw) {
          (result as Record<string, unknown>).debug_first_agent_raw = rawExtracted;
          // Incluir todas as chaves do agente para ver campos disponíveis
          (result as Record<string, unknown>).debug_agent_keys = Object.keys(raw);
        }
      } catch (agentError) {
        result.errors.push({
          hostname: agent.hostname || "desconhecido",
          error: agentError instanceof Error ? agentError.message : String(agentError),
        });
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Erro interno na sincronização",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
