import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar pontos dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: pontos, error: pontosError } = await supabase
      .from('pontos')
      .select('*')
      .eq('user_id', user.id)
      .gte('horario', thirtyDaysAgo.toISOString())
      .order('horario', { ascending: false });

    if (pontosError) {
      throw pontosError;
    }

    // Preparar dados para análise
    const pontosFormatados = pontos.map(p => ({
      tipo: p.tipo,
      horario: new Date(p.horario).toLocaleString('pt-BR'),
      dia_semana: new Date(p.horario).toLocaleDateString('pt-BR', { weekday: 'long' })
    }));

    const prompt = `Você é um assistente de análise de ponto eletrônico. Analise os seguintes registros dos últimos 30 dias e forneça:

1. Sugestões de pausas baseadas nos padrões de trabalho
2. Identificação de padrões (ex: horas extras frequentes, pausas irregulares)
3. Recomendações para melhor equilíbrio entre trabalho e descanso

Registros:
${JSON.stringify(pontosFormatados, null, 2)}

Forneça uma análise concisa e prática em português, com no máximo 3-4 pontos principais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente especializado em análise de gestão de tempo e bem-estar no trabalho. Seja objetivo e prático." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ 
        error: "Limite de requisições excedido. Tente novamente mais tarde." 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ 
        error: "Créditos da IA esgotados. Adicione créditos no seu workspace Lovable." 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      throw new Error("Erro ao processar análise com IA");
    }

    const data = await response.json();
    const analise = data.choices[0].message.content;

    return new Response(JSON.stringify({ analise, totalRegistros: pontos.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro na função analisar-pontos:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});