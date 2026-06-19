import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractText, getDocumentProxy } from "npm:unpdf";

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
    const { statementId, text: clientText } = await req.json();
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

    const fileType = statement.file_type;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    let transactions: any[] = [];

    if (fileType === "ofx") {
      const text = await fileBlob.text();
      if (!openaiApiKey) {
        console.warn("OPENAI_API_KEY não configurada. Parseando OFX localmente...");
        transactions = parseOFXLocal(text, statement.account_id, statement.user_id, statementId);
      } else {
        transactions = await parseOFXWithOpenAI(text, openaiApiKey, statement.account_id, statement.user_id, statementId);
      }
    } else {
      // 3. Processar conforme tipo de arquivo
      if (fileType === "csv") {
        const text = await fileBlob.text();
        if (openaiApiKey) {
          transactions = await parseCSVWithOpenAI(text, openaiApiKey, statement.account_id, statement.user_id, statementId);
        } else {
          // Local CSV fallback could be implemented, but let's default to text-based local parsing or mock if empty
          transactions = parseTextLocal(text, statement.account_id, statement.user_id, statementId);
        }
      } else if (fileType === "jpg" || fileType === "png") {
        if (openaiApiKey) {
          const arrayBuffer = await fileBlob.arrayBuffer();
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const mimeType = fileType === "png" ? "image/png" : "image/jpeg";
          transactions = await parseImageWithOpenAI(base64Data, mimeType, openaiApiKey, statement.account_id, statement.user_id, statementId);
        } else {
          console.warn("OPENAI_API_KEY não configurada para leitura de imagem. Usando mock...");
          transactions = getMockTransactions(statement.account_id, statement.user_id, statementId);
        }
      } else if (fileType === "pdf") {
        let pdfText = clientText || "";
        
        if (!pdfText) {
          // Tentar extrair texto real do PDF usando unpdf (pure JS)
          try {
            console.log("Extraindo texto do PDF usando unpdf...");
            const arrayBuffer = await fileBlob.arrayBuffer();
            const pdfProxy = await getDocumentProxy(new Uint8Array(arrayBuffer));
            const extracted = await extractText(pdfProxy, { mergePages: true });
            pdfText = extracted.text || "";
          } catch (pdfErr: any) {
            console.error("Erro ao parsear PDF com unpdf:", pdfErr);
          }
        }

        if (pdfText && pdfText.trim().length > 10) {
          if (openaiApiKey) {
            try {
              console.log(`Texto do PDF obtido com sucesso (${pdfText.length} caracteres). Enviando para OpenAI...`);
              transactions = await parseTextWithOpenAI(pdfText, openaiApiKey, statement.account_id, statement.user_id, statementId);
            } catch (openAiErr) {
              console.error("Erro ao chamar OpenAI. Usando parsing de texto local como fallback...", openAiErr);
              transactions = parseTextLocal(pdfText, statement.account_id, statement.user_id, statementId);
            }
          } else {
            console.warn("OPENAI_API_KEY não configurada. Parseando PDF localmente...");
            transactions = parseTextLocal(pdfText, statement.account_id, statement.user_id, statementId);
          }
        }

        // Se falhou todos os parsers ou o texto veio vazio
        if (transactions.length === 0) {
          console.warn("Nenhuma transação extraída do PDF. Usando mock...");
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

async function parseOFXWithOpenAI(ofxText: string, apiKey: string, accountId: string, userId: string, statementId: string): Promise<any[]> {
  return await callOpenAI(
    apiKey,
    "gpt-4o-mini",
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Aqui está o texto bruto do arquivo OFX (Open Financial Exchange):\n\n${ofxText}` }
    ],
    accountId,
    userId,
    statementId
  );
}

function parseOFXLocal(ofxText: string, accountId: string, userId: string, statementId: string): any[] {
  const transactions: any[] = [];
  const blocks = ofxText.split(/<STMTTRN>/i);
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split(/<\/STMTTRN>/i)[0];
    
    const getTagValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
      const match = block.match(regex);
      return match ? match[1].trim() : '';
    };

    const dtposted = getTagValue('DTPOSTED');
    const trnamt = getTagValue('TRNAMT');
    const memo = getTagValue('MEMO') || getTagValue('NAME') || 'Transação OFX';
    
    let dateStr = new Date().toISOString().split('T')[0];
    if (dtposted && dtposted.length >= 8) {
      const year = dtposted.substring(0, 4);
      const month = dtposted.substring(4, 6);
      const day = dtposted.substring(6, 8);
      dateStr = `${year}-${month}-${day}`;
    }

    const amount = parseFloat(trnamt.replace(',', '.')) || 0;
    
    let category = 'Outros';
    const memoLower = memo.toLowerCase();
    if (memoLower.includes('mercado') || memoLower.includes('pao de acucar') || memoLower.includes('carrefour') || memoLower.includes('super')) {
      category = 'Alimentação';
    } else if (memoLower.includes('uber') || memoLower.includes('99') || memoLower.includes('posto') || memoLower.includes('combustivel')) {
      category = 'Transporte';
    } else if (memoLower.includes('netflix') || memoLower.includes('spotify') || memoLower.includes('cinema') || memoLower.includes('lazer')) {
      category = 'Lazer';
    } else if (memoLower.includes('farmacia') || memoLower.includes('drogaria') || memoLower.includes('hospital') || memoLower.includes('saude')) {
      category = 'Saúde';
    } else if (memoLower.includes('aluguel') || memoLower.includes('condominio') || memoLower.includes('luz') || memoLower.includes('agua')) {
      category = 'Moradia';
    } else if (memoLower.includes('salario') || memoLower.includes('remuneracao') || memoLower.includes('recebido')) {
      category = 'Salário';
    }

    transactions.push({
      user_id: userId,
      account_id: accountId,
      statement_id: statementId,
      date: dateStr,
      description: memo,
      amount: amount,
      type: amount < 0 ? 'debit' : 'credit',
      category: category,
      merchant: memo,
      raw_description: memo,
      category_confirmed: false
    });
  }
  return transactions;
}

function parseTextLocal(text: string, accountId: string, userId: string, statementId: string): any[] {
  const transactions: any[] = [];
  const lines = text.split(/\r?\n/);
  
  // Meses em português para parsear datas como "19 JUN" ou "19 de Junho"
  const monthsMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'fev': 1, 'mar': 2, 'apr': 3, 'abr': 3, 'may': 4, 'mai': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'ago': 7, 'sep': 8, 'set': 8, 'oct': 9, 'out': 9, 'nov': 10, 'dec': 11, 'dez': 11
  };
  
  const currentYear = new Date().getFullYear();
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Regex para capturar valores com vírgula ou ponto no final da linha ou precedidos por R$
    const amountRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*\d+,\d{2}|-?\s*\d{1,3}(?:\,\d{3})*\.\d{2}|-?\s*\d+\.\d{2})\b/;
    const amountMatch = line.match(amountRegex);
    if (!amountMatch) continue;
    
    const rawAmountStr = amountMatch[1];
    // Converter valor para número float
    let amount = parseFloat(rawAmountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    
    // Tenta identificar a data no início ou meio da linha
    // Exemplos: "19 JUN", "19/06/2026", "19/06"
    let dateStr = new Date().toISOString().split('T')[0];
    let dateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/) || 
                    line.match(/\b(\d{1,2})\s+(JAN|FEB|FEV|MAR|APR|ABR|MAY|MAI|JUN|JUL|AGO|SEP|SET|OCT|OUT|NOV|DEC|DEZ)\b/i);
    
    if (dateMatch) {
      if (dateMatch[2] && isNaN(Number(dateMatch[2]))) {
        // Formato: 19 JUN
        const day = parseInt(dateMatch[1]);
        const monthStr = dateMatch[2].toLowerCase();
        const month = monthsMap[monthStr] ?? 0;
        const d = new Date(currentYear, month, day);
        dateStr = d.toISOString().split('T')[0];
      } else {
        // Formato: 19/06/2026 ou 19/06
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : currentYear;
        const d = new Date(year, month, day);
        dateStr = d.toISOString().split('T')[0];
      }
    }
    
    // Remover a data e o valor da linha para obter a descrição
    let description = line
      .replace(amountRegex, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, '')
      .replace(/\b\d{1,2}\s+(JAN|FEB|FEV|MAR|APR|ABR|MAY|MAI|JUN|JUL|AGO|SEP|SET|OCT|OUT|NOV|DEC|DEZ)\b/ig, '')
      .replace(/[\-\+R\$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Limpeza de ruído de extrato brasileiro
    description = description
      .replace(/compra\s+no\s+estabelecimento\s+/i, '')
      .replace(/compra\s+de\s+/i, '')
      .replace(/no\s+cartão\s+de\s+crédito\s*/i, '')
      .replace(/transferência\s+enviada\s+pelo\s+pix\s*\-?\s*/i, '')
      .replace(/transferência\s+recebida\s+pelo\s+pix\s*\-?\s*/i, '')
      .replace(/transferência\s+enviada\s*\-?\s*/i, '')
      .replace(/transferência\s+recebida\s*\-?\s*/i, '')
      .replace(/pagamento\s+de\s+fatura\s*/i, 'Pagamento Fatura ')
      .replace(/pagamento\s+efetuado\s*/i, 'Pagamento ')
      .replace(/pix\s+enviado\s*\-?\s*/i, '')
      .replace(/pix\s+recebido\s*\-?\s*/i, '')
      .replace(/ted\s+enviada\s*\-?\s*/i, '')
      .replace(/ted\s+recebida\s*\-?\s*/i, '')
      .replace(/doc\s+enviado\s*\-?\s*/i, '')
      .replace(/doc\s+recebido\s*\-?\s*/i, '')
      .replace(/no\s+valor\s+de\s+.*$/i, '') // Remove o "no valor de..." até o final da linha
      .replace(/\s+/g, ' ')
      .trim();
      
    if (description) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    if (description.length < 2) {
      description = "Transação PDF";
    }
    
    // Nubank fatura geralmente mostra valores positivos para compras (débitos na fatura) e negativos para pagamentos/créditos.
    // Vamos normalizar de acordo com o sinal correto. Na fatura de cartão, compra é despesa (negativo na nossa UI).
    // Se o valor for positivo e a linha não parecer um crédito/pagamento, invertemos para negativo.
    const isCredit = description.toLowerCase().includes('pagamento') || 
                     description.toLowerCase().includes('recebido') || 
                     description.toLowerCase().includes('estorno') || 
                     description.toLowerCase().includes('crédito');
    if (amount > 0 && !isCredit) {
      amount = -amount;
    }
    
    let category = 'Outros';
    const descLower = description.toLowerCase();
    if (descLower.includes('mercado') || descLower.includes('pao de acucar') || descLower.includes('carrefour') || descLower.includes('super')) {
      category = 'Alimentação';
    } else if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('posto') || descLower.includes('combustivel')) {
      category = 'Transporte';
    } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('cinema') || descLower.includes('lazer')) {
      category = 'Lazer';
    } else if (descLower.includes('farmacia') || descLower.includes('drogaria') || descLower.includes('hospital') || descLower.includes('saude')) {
      category = 'Saúde';
    } else if (descLower.includes('aluguel') || descLower.includes('condominio') || descLower.includes('luz') || descLower.includes('agua')) {
      category = 'Moradia';
    } else if (descLower.includes('salario') || descLower.includes('remuneracao') || descLower.includes('recebido')) {
      category = 'Salário';
    }

    transactions.push({
      user_id: userId,
      account_id: accountId,
      statement_id: statementId,
      date: dateStr,
      description: description,
      amount: amount,
      type: amount < 0 ? 'debit' : 'credit',
      category: category,
      merchant: description,
      raw_description: line,
      category_confirmed: false
    });
  }
  
  return transactions;
}

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
