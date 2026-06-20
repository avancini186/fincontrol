import type { ParsedTransaction } from './nubank';

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

export const extractBBDetails = (details: string): {
  payee: string | null;
  cpfCnpj: string | null;
  time: string | null;
} => {
  let cleanDetails = details.trim();
  let time: string | null = null;
  let cpfCnpj: string | null = null;

  // Match time (e.g. 13:40)
  const timeMatch = cleanDetails.match(/\b\d{2}:\d{2}\b/);
  if (timeMatch) {
    time = timeMatch[0];
    cleanDetails = cleanDetails.replace(time, '').trim();
  }

  // Remove leading date in details (e.g. "01/06 ")
  cleanDetails = cleanDetails.replace(/^\d{2}\/\d{2}\s+/, '').trim();

  // Match CPF or CNPJ
  const cnpjRegex = /\b\d{2}\.\d{3}\.\d.3\/\d{4}\-\d{2}\b|\b\d{14}\b/;
  const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b|\b\d{11}\b/;
  
  const cnpjMatch = cleanDetails.match(cnpjRegex);
  if (cnpjMatch) {
    cpfCnpj = cnpjMatch[0];
    cleanDetails = cleanDetails.replace(cpfCnpj, '').trim();
  } else {
    const cpfMatch = cleanDetails.match(cpfRegex);
    if (cpfMatch) {
      cpfCnpj = cpfMatch[0];
      cleanDetails = cleanDetails.replace(cpfCnpj, '').trim();
    }
  }

  // Clean remaining extra spaces
  cleanDetails = cleanDetails.replace(/\s+/g, ' ').trim();

  let payee = cleanDetails || null;
  
  // Clean placeholder/empty details
  if (payee === '' || payee === '-') {
    payee = null;
  }

  return { payee, cpfCnpj, time };
};

export const classifyBBCategory = (launch: string, payee: string | null): string => {
  const launchUpper = launch.toUpperCase();
  const payeeUpper = payee ? payee.toUpperCase() : '';

  if (launchUpper.includes('PROVENTOS') || launchUpper.includes('SALARIO') || launchUpper.includes('VENCIMENTOS') || launchUpper.includes('CONTRACHEQUE')) {
    return 'Salário';
  }
  if (launchUpper.includes('RENDE FACIL') || launchUpper.includes('INVEST') || launchUpper.includes('APLICACAO') || launchUpper.includes('RESGATE')) {
    return 'Investimentos';
  }
  if (launchUpper.includes('BOLETO') || launchUpper.includes('CONVENIO') || launchUpper.includes('TELEFONE') || launchUpper.includes('LUZ') || launchUpper.includes('AGUA')) {
    return 'Moradia';
  }
  
  if (payeeUpper.includes('MERCADO') || payeeUpper.includes('SUPERMERCADO') || payeeUpper.includes('CARREFOUR') || payeeUpper.includes('PAO DE ACUCAR') || payeeUpper.includes('ALIMENTOS')) {
    return 'Alimentação';
  }
  if (payeeUpper.includes('UBER') || payeeUpper.includes('99') || payeeUpper.includes('POSTO') || payeeUpper.includes('COMBUSTIVEL')) {
    return 'Transporte';
  }
  if (payeeUpper.includes('NETFLIX') || payeeUpper.includes('SPOTIFY') || payeeUpper.includes('LAZER') || payeeUpper.includes('CINEMA') || payeeUpper.includes('CLUBE')) {
    return 'Lazer';
  }
  if (payeeUpper.includes('FARMACIA') || payeeUpper.includes('DROGARIA') || payeeUpper.includes('HOSPITAL') || payeeUpper.includes('MEDICO') || payeeUpper.includes('SAUDE') || payeeUpper.includes('SEGURO')) {
    return 'Saúde';
  }
  
  return 'Outros';
};

export const parseBBCSV = (csvText: string, _userId: string, _accountId: string, _statementId: string, currentUserName = ''): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Check header
  const header = lines[0].toLowerCase();
  let delimiter = ',';
  if (header.includes(';')) delimiter = ';';
  
  const headers = header.split(delimiter).map(h => h.trim());
  const dateIdx = headers.findIndex(h => h.includes('data'));
  const launchIdx = headers.findIndex(h => h.includes('lan') || h.includes('historico'));
  const detailsIdx = headers.findIndex(h => h.includes('detalhe'));
  const amountIdx = headers.findIndex(h => h.includes('val') || h.includes('amount'));
  const typeIdx = headers.findIndex(h => h.includes('tipo'));

  if (dateIdx === -1 || amountIdx === -1 || launchIdx === -1) return [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(delimiter).map(col => col.replace(/^["']|["']$/g, '').trim());
    if (columns.length <= Math.max(dateIdx, amountIdx, launchIdx)) continue;

    const rawDate = columns[dateIdx];
    const rawLaunch = columns[launchIdx];
    const rawDetails = detailsIdx !== -1 ? columns[detailsIdx] : '';
    const rawAmount = columns[amountIdx];

    // Ignore daily balances and non-transactions
    const launchUpper = rawLaunch.toUpperCase();
    if (
      launchUpper.includes('SALDO ANTERIOR') ||
      launchUpper.includes('SALDO DO DIA') ||
      launchUpper.includes('SALDO ATUAL') ||
      rawDate === '00/00/0000' ||
      rawDate === ''
    ) {
      continue;
    }

    // Parse date
    let dateStr = '';
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

    // Date fallback
    if (!dateStr || isNaN(Date.parse(dateStr)) || dateStr.startsWith('0000') || dateStr.includes('0000')) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    let amount = parseNumericValue(rawAmount);
    
    // Determine type
    let type = 'debit';
    const rawType = typeIdx !== -1 ? columns[typeIdx].toUpperCase() : '';
    if (rawType.includes('ENTRADA') || rawType.includes('CREDITO') || amount > 0) {
      type = 'credit';
    }

    // Clean details
    const { payee, time } = extractBBDetails(rawDetails);
    
    // Build UI description
    let cleanDesc = rawLaunch;
    let finalType = type;

    if (launchUpper.includes('PIX - RECEBIDO') || launchUpper.includes('PIX RECEBIDO')) {
      finalType = 'PIX_RECEBIDO';
      cleanDesc = payee ? `Pix de ${payee}` : 'Pix recebido';
    } else if (launchUpper.includes('PIX - ENVIADO') || launchUpper.includes('PIX ENVIADO')) {
      finalType = 'PIX_ENVIADO';
      cleanDesc = payee ? `Pix para ${payee}` : 'Pix enviado';
    } else if (launchUpper.includes('PAGAMENTO DE BOLETO')) {
      finalType = 'PAGAMENTO_BOLETO';
      cleanDesc = payee ? `Pagamento: ${payee}` : 'Pagamento de boleto';
    } else if (launchUpper.includes('BB RENDE FACIL') || launchUpper.includes('RENDE FACIL')) {
      finalType = amount < 0 ? 'APLICACAO_RDB' : 'RESGATE_RDB'; // Map to RDB-like types for UI/badges
      cleanDesc = amount < 0 ? 'Aplicação Rende Fácil' : 'Resgate Rende Fácil';
    }

    // Detect internal transfers to self
    if (payee && currentUserName && isSamePerson(payee, currentUserName)) {
      cleanDesc = 'Transf. entre contas próprias';
      finalType = 'transfer';
    }

    // Append time if available
    if (time) {
      cleanDesc = `${cleanDesc} às ${time}`;
    }

    const category = classifyBBCategory(rawLaunch, payee);

    transactions.push({
      date: dateStr,
      description: cleanDesc,
      amount: amount,
      type: finalType,
      category: category,
      merchant: payee || rawLaunch,
      raw_description: line,
      payee: payee,
      institution: 'Banco do Brasil'
    });
  }

  return transactions;
};
