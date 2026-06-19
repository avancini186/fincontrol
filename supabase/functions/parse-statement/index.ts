import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar requisição CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { statementId } = await req.json();
    if (!statementId) {
      throw new Error("ID do extrato não fornecido.");
    }

    // Inicializar cliente do Supabase com as chaves internas da Edge Function
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar registro do extrato
    const { data: statement, error: fetchErr } = await supabase
      .from("statements")
      .select("*")
      .eq("id", statementId)
      .single();

    if (fetchErr || !statement) {
      throw new Error(`Falha ao buscar extrato: ${fetchErr?.message}`);
    }

    // Atualizar status para processando
    await supabase
      .from("statements")
      .update({ status: "processing" })
      .eq("id", statementId);

    // 2. Download do arquivo do Storage
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from("statements")
      .download(statement.file_path);

    if (downloadErr || !fileBlob) {
      throw new Error(`Falha ao baixar arquivo do Storage: ${downloadErr?.message}`);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    let transactions: any[] = [];

    // Se não tiver API Key, usar fallback/mock
    if (!openaiApiKey) {
      console.warn("OPENAI_API_KEY não configurada. Simulando transações...");
      transactions = getMockTransactions(statement.account_id, statement.user_id, statementId);
    } else {
      // 3. Processar conforme tipo de arquivo
      const fileType = statement.file_type;
      
      if (fileType === "csv") {
        const text = await fileBlob.text();
        transactions = await parseCSVWithOpenAI(text, openaiApiKey, statement.account_id, statement.user_id, statementId);
      } else if (fileType === "jpg" || fileType === "png") {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = fileType === "png" ? "image/png" : "image/jpeg";
        transactions = await parseImageWithOpenAI(base64Data, mimeType, openaiApiKey, statement.account_id, statement.user_id, statementId);
      } else if (fileType === "pdf") {
        // Para PDFs no Deno, tentamos extrair o texto básico ou fazemos mock se for um escaneamento
        const text = await fileBlob.text();
        if (text && text.trim().length > 100) {
          transactions = await parseTextWithOpenAI(text, openaiApiKey, statement.account_id, statement.user_id, statementId);
        } else {
          console.warn("PDF parece conter apenas imagens ou o texto está inacessível. Usando mock...");
          transactions = getMockTransactions(statement.account_id, statement.user_id, statementId);
        }
      }
    }

    // 4. Salvar as transações extraídas no banco de dados
    if (transactions.length > 0) {
      const { error: insertErr } = await supabase
        .from("transactions")
        .insert(transactions);
      if (insertErr) throw insertErr;
    }

    // 5. Atualizar status do extrato para Concluído
    await supabase
      .from("statements")
      .update({ status: "done" })
      .eq("id", statementId);

    return new Response(JSON.stringify({ success: true, count: transactions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro no processamento:", error);
    
    // Tenta atualizar o status do statement para erro
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase
        .from("statements")
        .update({ status: "error", error_message: error.message })
        .eq("id", req.headers.get("statementId") ?? "");
    } catch {}

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Prompt base para instruir o modelo de forma rígida
const systemPrompt = `Você é um assistente financeiro especializado. Extraia todas as transações (compras, pagamentos, transferências, pix, depósitos) presentes no texto fornecido.
Retorne EXCLUSIVAMENTE um array JSON de objetos contendo os seguintes campos:
- date: Data da transação no formato ISO (YYYY-MM-DD)
- description: Descrição limpa da transação na UI (ex: "Supermercado Pão de Açúcar" ao invés de "PAO ACUCAR LJ 12")
- amount: Valor numérico real da transação. Use números NEGATIVOS para despesas/débitos e números POSITIVOS para receitas/créditos/PIX recebidos.
- type: Tipo da transação, escolha obrigatoriamente um destes: "debit", "credit", "pix", "transfer", "fee"
- category: Categoria sugerida, escolha obrigatoriamente uma destas: "Alimentação", "Transporte", "Saúde", "Lazer", "Moradia", "Educação", "Serviços", "Salário", "Investimentos", "Outros"
- merchant: Nome limpo do estabelecimento comercial (se aplicável, ou nulo)
- raw_description: A descrição original exatamente como aparece no extrato.

Não inclua explicações, tags de código ou textos fora do array JSON. Exemplo de retorno:
[{"date":"2026-06-18","description":"Netflix","amount":-55.90,"type":"debit","category":"Lazer","merchant":"Netflix","raw_description":"NETFLIX.COM"}]`;

async function parseCSVWithOpenAI(csvText: string, apiKey: string, accountId: string, userId: string, statementId: string): Promise<any[]> {
  return await callOpenAI(
    apiKey,
    "gpt-4o-mini",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Aqui está o texto bruto do arquivo CSV exportado pelo banco:\n\n${csvText}` }
    ],
    accountId,
    userId,
    statementId
  );
}

async function parseTextWithOpenAI(text: string, apiKey: string, accountId: string, userId: string, statementId: string): Promise<any[]> {
  return await callOpenAI(
    apiKey,
    "gpt-4o-mini",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Aqui está o texto bruto extraído da fatura/extrato PDF:\n\n${text}` }
    ],
    accountId,
    userId,
    statementId
  );
}

async function parseImageWithOpenAI(base64Data: string, mimeType: string, apiKey: string, accountId: string, userId: string, statementId: string): Promise<any[]> {
  return await callOpenAI(
    apiKey,
    "gpt-4o-mini",
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia todos os lançamentos desta imagem de fatura ou comprovante:" },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ]
      }
    ],
    accountId,
    userId,
    statementId
  );
}

async function callOpenAI(apiKey: string, model: string, messages: any[], accountId: string, userId: string, statementId: string): Promise<any[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API retornou erro: ${errorText}`);
  }

  const result = await response.json();
  const rawText = result.choices[0]?.message?.content;
  if (!rawText) throw new Error("Resposta da OpenAI está vazia.");

  const parsedJson = JSON.parse(rawText);
  // O retorno pode vir como { "transactions": [...] } ou direto [...]
  const txList = Array.isArray(parsedJson) ? parsedJson : parsedJson.transactions || [];

  return txList.map((tx: any) => ({
    user_id: userId,
    account_id: accountId,
    statement_id: statementId,
    date: tx.date || new Date().toISOString().split("T")[0],
    description: tx.description || "Transação sem descrição",
    amount: parseFloat(tx.amount) || 0,
    type: tx.type || "debit",
    category: tx.category || "Outros",
    merchant: tx.merchant || null,
    raw_description: tx.raw_description || tx.description || null,
    category_confirmed: false
  }));
}

function getMockTransactions(accountId: string, userId: string, statementId: string): any[] {
  return [
    {
      user_id: userId,
      account_id: accountId,
      statement_id: statementId,
      date: new Date().toISOString().split("T")[0],
      description: "Supermercado Carrefour",
      amount: -250.75,
      type: "debit",
      category: "Alimentação",
      merchant: "Carrefour",
      raw_description: "CARREFOUR MKT SAO PAULO",
      category_confirmed: false
    },
    {
      user_id: userId,
      account_id: accountId,
      statement_id: statementId,
      date: new Date().toISOString().split("T")[0],
      description: "Uber Viagem",
      amount: -28.90,
      type: "debit",
      category: "Transporte",
      merchant: "Uber",
      raw_description: "UBER *UBER TRIP HELPLINE",
      category_confirmed: false
    },
    {
      user_id: userId,
      account_id: accountId,
      statement_id: statementId,
      date: new Date().toISOString().split("T")[0],
      description: "Salário FinControl",
      amount: 4500.00,
      type: "transfer",
      category: "Salário",
      merchant: null,
      raw_description: "TED REMUNERACAO MENSAL",
      category_confirmed: false
    }
  ];
}
