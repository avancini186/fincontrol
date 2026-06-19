export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  merchant: string;
  raw_description: string;
  payee: string | null;
  institution: string | null;
}

export const classifyCategory = (description: string, type: string): string => {
  const descUpper = description.toUpperCase();
  
  if (descUpper.includes('SEGUROS SURA')) return 'Saúde';
  if (descUpper.includes('BS CONECT TELECOMUNICACOES')) return 'Serviços';
  if (descUpper.includes('GCI CAIXA HABITAÇÃO')) return 'Moradia';
  if (descUpper.includes('PREF MUN ITAPIRA')) return 'Outros';
  if (descUpper.includes('APM ANTONIO CAIO')) return 'Educação';
  if (descUpper.includes('CARREFOUR') || descUpper.includes('PÃO DE AÇÚCAR') || descUpper.includes('PAO DE ACUCAR') || descUpper.includes('MERCADO')) return 'Alimentação';
  if (descUpper.includes('UBER') || descUpper.includes('99') || descUpper.includes('POSTO') || descUpper.includes('COMBUSTIVEL')) return 'Transporte';
  if (descUpper.includes('NETFLIX') || descUpper.includes('SPOTIFY') || descUpper.includes('LAZER') || descUpper.includes('CINEMA')) return 'Lazer';
  if (descUpper.includes('FARMACIA') || descUpper.includes('DROGARIA') || descUpper.includes('HOSPITAL') || descUpper.includes('MEDICO')) return 'Saúde';
  if (descUpper.includes('ALUGUEL') || descUpper.includes('CONDOMINIO') || descUpper.includes('LUZ') || descUpper.includes('AGUA')) return 'Moradia';
  
  if (type === 'APLICACAO_RDB' || type === 'RESGATE_RDB') return 'Investimentos';
  if (type === 'CREDITO_CONTA' || type === 'SALARIO') return 'Salário';
  if (type === 'PIX_RECEBIDO' || type === 'TED_RECEBIDA') return 'Outros';
  
  return 'Outros';
};

const parseNumericValue = (val: string): number => {
  const cleanVal = val.replace(/\s/g, '').trim();
  if (cleanVal.includes(',') && cleanVal.includes('.')) {
    const commaPos = cleanVal.indexOf(',');
    const dotPos = cleanVal.indexOf('.');
    return commaPos > dotPos 
      ? (parseFloat(cleanVal.replace(/\./g, '').replace(',', '.')) || 0)
      : (parseFloat(cleanVal.replace(/,/g, '')) || 0);
  }
  if (cleanVal.includes(',')) return parseFloat(cleanVal.replace(',', '.')) || 0;
  return parseFloat(cleanVal) || 0;
};

export const normalizeNubankDescription = (rawDesc: string, amount: number, currentUserName = ''): {
  description: string;
  payee: string | null;
  institution: string | null;
  type: string;
} => {
  const desc = rawDesc.trim();
  const descUpper = desc.toUpperCase();
  
  let cleanDesc = desc;
  let payee: string | null = null;
  let institution: string | null = null;
  let type = amount < 0 ? 'debit' : 'credit';

  if (descUpper.includes('TRANSFERÊNCIA ENVIADA PELO PIX') || descUpper.includes('PIX ENVIADO') || descUpper.includes('PAGAMENTO ENVIADO PIX')) {
    type = 'PIX_ENVIADO';
    const parts = desc.split(/\s*-\s*/);
    if (parts.length >= 2) {
      payee = parts[1].trim();
      if (parts.length >= 3) {
        institution = parts[2].trim();
      }
    }
    if (payee && currentUserName && isSamePerson(payee, currentUserName)) {
      cleanDesc = institution ? `Transf. entre contas (${institution})` : 'Transf. entre contas próprias';
      type = 'transfer';
    } else {
      cleanDesc = payee ? `Pix para ${payee}` : 'Pix enviado';
    }
  }
  else if (descUpper.includes('TRANSFERÊNCIA RECEBIDA PELO PIX') || descUpper.includes('PIX RECEBIDO') || descUpper.includes('PAGAMENTO RECEBIDO PIX')) {
    type = 'PIX_RECEBIDO';
    const parts = desc.split(/\s*-\s*/);
    if (parts.length >= 2) {
      payee = parts[1].trim();
      if (parts.length >= 3) {
        institution = parts[2].trim();
      }
    }
    if (payee && currentUserName && isSamePerson(payee, currentUserName)) {
      cleanDesc = institution ? `Transf. entre contas (${institution})` : 'Transf. entre contas próprias';
      type = 'transfer';
    } else {
      cleanDesc = payee ? `Pix de ${payee}` : 'Pix recebido';
    }
  }
  else if (descUpper.includes('APLICAÇÃO RDB') || descUpper.includes('APLICACAO RDB')) {
    type = 'APLICACAO_RDB';
    cleanDesc = 'Aplicação RDB';
    payee = 'Nu Financeira';
    institution = 'Nubank';
  }
  else if (descUpper.includes('RESGATE RDB')) {
    type = 'RESGATE_RDB';
    cleanDesc = 'Resgate RDB';
    payee = 'Nu Financeira';
    institution = 'Nubank';
  }
  else if (descUpper.includes('PAGAMENTO DE BOLETO') || descUpper.includes('PAGAMENTO EFETUADO')) {
    type = 'PAGAMENTO_BOLETO';
    cleanDesc = 'Pagamento de boleto';
    const parts = desc.split(/\s*-\s*/);
    if (parts.length >= 2) {
      cleanDesc = `Pagamento: ${parts[1].trim()}`;
    }
  }
  else if (descUpper.includes('CRÉDITO EM CONTA') || descUpper.includes('CREDITO EM CONTA')) {
    type = 'CREDITO_CONTA';
    cleanDesc = 'Crédito em conta';
  }
  else if (descUpper.includes('RENDIMENTO') || descUpper.includes('RENDIMENTOS')) {
    type = 'RENDIMENTOS';
    cleanDesc = 'Rendimentos de conta';
    payee = 'Nubank';
  }
  else if (descUpper.includes('TED ENVIADA') || descUpper.includes('TED RECEBIDA')) {
    type = descUpper.includes('ENVIADA') ? 'TED_ENVIADA' : 'TED_RECEBIDA';
    const parts = desc.split(/\s*-\s*/);
    if (parts.length >= 2) {
      payee = parts[1].trim();
      if (parts.length >= 3) institution = parts[2].trim();
    }
    cleanDesc = payee ? `TED para ${payee}` : 'TED';
  }
  else if (descUpper.includes('COMPRA NO ESTABELECIMENTO') || descUpper.includes('COMPRA DE')) {
    type = 'COMPRA';
    cleanDesc = desc
      .replace(/compra\s+no\s+estabelecimento\s+/i, '')
      .replace(/compra\s+de\s+/i, '')
      .replace(/no\s+cartão\s+de\s+crédito\s*/i, '')
      .replace(/no\s+valor\s+de\s+.*$/i, '')
      .trim();
    payee = cleanDesc;
  }

  if (cleanDesc) {
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  }

  return { description: cleanDesc, payee, institution, type };
};

function isSamePerson(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const n2 = name2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  if (n1 === n2) return true;
  
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  if (parts1.length >= 2 && parts2.length >= 2) {
    return parts1[0] === parts2[0] && parts1[1] === parts2[1];
  }
  return false;
}

export const parseNubankCSV = (csvText: string, _userId: string, _accountId: string, _statementId: string, currentUserName = ''): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  let delimiter = ',';
  if (header.includes(';')) delimiter = ';';
  
  const headers = header.split(delimiter).map(h => h.trim());
  const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('tit') || h.includes('desc') || h.includes('memo'));
  const amountIdx = headers.findIndex(h => h.includes('val') || h.includes('amount'));

  if (dateIdx === -1 || amountIdx === -1) return [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(delimiter).map(col => col.replace(/^["']|["']$/g, '').trim());
    if (columns.length <= Math.max(dateIdx, amountIdx)) continue;

    const rawDate = columns[dateIdx];
    const rawDesc = descIdx !== -1 ? columns[descIdx] : 'Lançamento Nubank';
    const rawAmount = columns[amountIdx];

    if (!rawDate || !rawAmount) continue;

    let dateStr = new Date().toISOString().split('T')[0];
    if (rawDate.includes('-')) {
      dateStr = rawDate;
    } else if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dateStr = `${year}-${month}-${day}`;
      }
    }

    let amount = parseNumericValue(rawAmount);
    const enriched = normalizeNubankDescription(rawDesc, amount, currentUserName);
    const category = classifyCategory(enriched.description || rawDesc, enriched.type);

    transactions.push({
      date: dateStr,
      description: enriched.description,
      amount: amount,
      type: enriched.type,
      category: category,
      merchant: enriched.payee || enriched.description,
      raw_description: rawDesc,
      payee: enriched.payee,
      institution: enriched.institution
    });
  }

  return transactions;
};

export const parseNubankPDFText = (pdfText: string, _userId: string, _accountId: string, _statementId: string, currentUserName = ''): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  const lines = pdfText.split(/\r?\n/);
  
  const monthsMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'fev': 1, 'mar': 2, 'apr': 3, 'abr': 3, 'may': 4, 'mai': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'ago': 7, 'sep': 8, 'set': 8, 'oct': 9, 'out': 9, 'nov': 10, 'dec': 11, 'dez': 11
  };
  const currentYear = new Date().getFullYear();

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const lineUpper = line.toUpperCase();
    if (
      lineUpper.includes('TOTAL ENTRADAS') ||
      lineUpper.includes('TOTAL SAÍDAS') ||
      lineUpper.includes('SALDO FINAL') ||
      lineUpper.includes('SALDO ANTERIOR') ||
      lineUpper.includes('EXTRATO DE:') ||
      lineUpper.includes('NUBANK - EXTRATO')
    ) {
      continue;
    }

    const amountRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*\d+,\d{2}|-?\s*\d{1,3}(?:\,\d{3})*\.\d{2}|-?\s*\d+\.\d{2})\b/;
    const amountMatch = line.match(amountRegex);
    if (!amountMatch) continue;

    const rawAmountStr = amountMatch[1];
    let amount = parseNumericValue(rawAmountStr);

    let dateStr = new Date().toISOString().split('T')[0];
    let dateMatch = line.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/) || 
                    line.match(/\b(\d{1,2})\s+(JAN|FEB|FEV|MAR|APR|ABR|MAY|MAI|JUN|JUL|AGO|SEP|SET|OCT|OUT|NOV|DEC|DEZ)\b/i);
    
    if (dateMatch) {
      if (dateMatch[2] && isNaN(Number(dateMatch[2]))) {
        const day = parseInt(dateMatch[1]);
        const monthStr = dateMatch[2].toLowerCase();
        const month = monthsMap[monthStr] ?? 0;
        const d = new Date(currentYear, month, day);
        dateStr = d.toISOString().split('T')[0];
      } else {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3])) : currentYear;
        const d = new Date(year, month, day);
        dateStr = d.toISOString().split('T')[0];
      }
    }

    let descriptionRaw = line
      .replace(amountRegex, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/, '')
      .replace(/\b\d{1,2}\s+(JAN|FEB|FEV|MAR|APR|ABR|MAY|MAI|JUN|JUL|AGO|SEP|SET|OCT|OUT|NOV|DEC|DEZ)\b/i, '')
      .replace(/[\-\+R\$]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (descriptionRaw.length < 2) continue;

    const enriched = normalizeNubankDescription(descriptionRaw, amount, currentUserName);
    const category = classifyCategory(enriched.description || descriptionRaw, enriched.type);

    const isCredit = enriched.description.toLowerCase().includes('pagamento') || 
                     enriched.description.toLowerCase().includes('recebido') || 
                     enriched.description.toLowerCase().includes('estorno') || 
                     enriched.description.toLowerCase().includes('crédito');
    if (amount > 0 && !isCredit) {
      amount = -amount;
    }

    transactions.push({
      date: dateStr,
      description: enriched.description,
      amount: amount,
      type: enriched.type,
      category: category,
      merchant: enriched.payee || enriched.description,
      raw_description: line,
      payee: enriched.payee,
      institution: enriched.institution
    });
  }

  return transactions;
};
