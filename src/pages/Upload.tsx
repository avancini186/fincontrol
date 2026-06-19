import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  MenuItem, 
  CircularProgress,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { PageType } from '../types';
import { supabase } from '../supabaseClient';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface UploadPageProps {
  onNavigate: (page: PageType) => void;
}

export default function UploadPage({ onNavigate }: UploadPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const { data, error } = await supabase.from('accounts').select('id, name, type');
        if (error) throw error;
        setAccounts(data || []);
        if (data && data.length > 0) {
          setSelectedAccount(data[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar contas:', err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  // Garante que o bucket 'statements' exista no Supabase Storage
  const ensureStorageBucket = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === 'statements');
      if (!exists) {
        // Tenta criar o bucket (requer que as permissões estejam corretas ou ignora falha silenciosamente se já criado)
        await supabase.storage.createBucket('statements', {
          public: false,
          allowedMimeTypes: ['text/csv', 'application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/x-ofx'],
          fileSizeLimit: 10485760 // 10MB
        });
      }
    } catch (err) {
      console.warn('Nota: Não foi possível verificar/criar o bucket automaticamente (provavelmente por falta de permissão de admin. Se necessário, crie o bucket "statements" manualmente no painel).');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const parseOFXString = (ofxText: string): any[] => {
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
  };

  const parseTextLocal = (text: string): any[] => {
    const transactions: any[] = [];
    const lines = text.split(/\r?\n/);
    
    const monthsMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'fev': 1, 'mar': 2, 'apr': 3, 'abr': 3, 'may': 4, 'mai': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'ago': 7, 'sep': 8, 'set': 8, 'oct': 9, 'out': 9, 'nov': 10, 'dec': 11, 'dez': 11
    };
    
    const currentYear = new Date().getFullYear();
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const amountRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*\d+,\d{2}|-?\s*\d{1,3}(?:\,\d{3})*\.\d{2}|-?\s*\d+\.\d{2})\b/;
      const amountMatch = line.match(amountRegex);
      if (!amountMatch) continue;
      
      const rawAmountStr = amountMatch[1];
      let amount = parseFloat(rawAmountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
      
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
  };

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!(window as any).pdfjsLib) {
        setStatusMessage({ type: 'info', text: 'Carregando motor de PDF local...' });
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          startExtraction(pdfFile, resolve, reject);
        };
        script.onerror = () => reject(new Error('Erro ao carregar motor de PDF local.'));
        document.head.appendChild(script);
      } else {
        startExtraction(pdfFile, resolve, reject);
      }
    });
  };

  const startExtraction = async (pdfFile: File, resolve: (val: string) => void, reject: (err: any) => void) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        setStatusMessage({ type: 'info', text: `Lendo página ${i} de ${pdf.numPages}...` });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => (item as any).str).join(' ');
        fullText += pageText + '\n';
      }
      resolve(fullText);
    } catch (err) {
      reject(err);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setStatusMessage(null);
    const validExtensions = ['csv', 'pdf', 'jpg', 'jpeg', 'png', 'ofx'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(extension)) {
      setStatusMessage({ type: 'error', text: 'Formato inválido. Selecione apenas arquivos CSV, PDF, JPG, PNG ou OFX.' });
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !selectedAccount) return;

    setUploading(true);
    setUploadProgress(10);
    setStatusMessage({ type: 'info', text: 'Preparando upload...' });

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      // Extrair texto localmente se for PDF antes de qualquer coisa
      let pdfText = '';
      if (fileExtension === 'pdf') {
        try {
          pdfText = await extractTextFromPDF(file);
        } catch (pdfErr) {
          console.error('Erro na extração local de PDF:', pdfErr);
        }
      }

      // 1. Verificar/criar o bucket
      await ensureStorageBucket();
      setUploadProgress(30);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const filePath = `${userId}/${Date.now()}_${file.name}`;

      // 2. Upload para o Supabase Storage
      setStatusMessage({ type: 'info', text: 'Enviando arquivo para o armazenamento seguro...' });
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // 3. Registrar o arquivo na tabela `statements`
      setStatusMessage({ type: 'info', text: 'Registrando importação no banco de dados...' });
      const { data: statement, error: dbError } = await supabase
        .from('statements')
        .insert([
          {
            user_id: userId,
            account_id: selectedAccount,
            file_name: file.name,
            file_path: filePath,
            file_type: fileExtension === 'jpeg' ? 'jpg' : fileExtension,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;
      setUploadProgress(90);

      // 4. Acionar a Edge Function para fazer o parsing (ou fazer localmente para PDF/OFX)
      let localTransactions: any[] = [];
      let parsedLocally = false;

      if (fileExtension === 'ofx') {
        try {
          setStatusMessage({ type: 'info', text: 'Processando arquivo OFX localmente...' });
          const text = await file.text();
          const parsed = parseOFXString(text);
          localTransactions = parsed.map(tx => ({
            ...tx,
            user_id: userId,
            account_id: selectedAccount,
            statement_id: statement.id
          }));
          parsedLocally = true;
        } catch (ofxErr) {
          console.error('Erro ao parsear OFX localmente:', ofxErr);
        }
      } else if (fileExtension === 'pdf' && pdfText) {
        try {
          setStatusMessage({ type: 'info', text: 'Processando texto do PDF localmente...' });
          const parsed = parseTextLocal(pdfText);
          localTransactions = parsed.map(tx => ({
            ...tx,
            user_id: userId,
            account_id: selectedAccount,
            statement_id: statement.id
          }));
          parsedLocally = true;
        } catch (pdfLocalErr) {
          console.error('Erro ao parsear PDF localmente:', pdfLocalErr);
        }
      }

      if (parsedLocally) {
        if (localTransactions.length > 0) {
          const { error: insertErr } = await supabase.from('transactions').insert(localTransactions);
          if (insertErr) throw insertErr;
          await supabase.from('statements').update({ status: 'done' }).eq('id', statement.id);
        } else {
          throw new Error('Nenhuma transação encontrada no arquivo PDF/OFX.');
        }
      } else {
        // Para imagens (PNG/JPG), chamamos a Edge Function inteligente
        setStatusMessage({ type: 'info', text: 'Processando com inteligência artificial...' });
        const { error: functionError } = await supabase.functions.invoke('parse-statement', {
          body: { statementId: statement.id }
        });
        
        if (functionError) {
          throw functionError;
        }
      }

      setUploadProgress(100);
      setStatusMessage({ type: 'success', text: 'Arquivo enviado e processado com sucesso! Redirecionando para a tela de revisão...' });
      
      setTimeout(() => {
        onNavigate('review');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Falha no processamento. Verifique sua conexão ou configurações.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>Importar Extrato ou Fatura</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Faça o upload do seu extrato bancário ou fatura nos formatos CSV, PDF, JPG, PNG ou OFX para processamento automático.
      </Typography>

      {loadingAccounts ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Antes de importar arquivos, você precisa cadastrar pelo menos uma conta corrente ou cartão de crédito.
          <Button variant="text" size="small" onClick={() => onNavigate('accounts')} sx={{ ml: 2, fontWeight: 'bold' }}>
            Ir para Contas
          </Button>
        </Alert>
      ) : (
        <Card sx={{ bgcolor: 'background.paper', p: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              select
              label="Conta de Destino"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              fullWidth
            >
              {accounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'checking' ? 'Conta Corrente' : 'Cartão de Crédito'})
                </MenuItem>
              ))}
            </TextField>

            {/* Drag and Drop Zone */}
            <Box
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'rgba(255,255,255,0.12)',
                borderRadius: 4,
                p: 5,
                textAlign: 'center',
                bgcolor: dragActive ? 'primary.dark' : 'transparent',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                }
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileInput}
                accept=".csv,.pdf,.jpg,.jpeg,.png,.ofx"
              />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Arraste seu extrato aqui ou clique para selecionar
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Formatos aceitos: CSV, PDF, JPG, PNG ou OFX (Max 10MB)
              </Typography>
            </Box>

            {file && (
              <List sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, p: 1 }}>
                <ListItem>
                  <ListItemIcon>
                    <InsertDriveFile color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={file.name} 
                    secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} 
                  />
                </ListItem>
              </List>
            )}

            {statusMessage && (
              <Alert 
                severity={statusMessage.type === 'info' ? 'info' : statusMessage.type} 
                icon={statusMessage.type === 'success' ? <CheckCircle /> : statusMessage.type === 'error' ? <ErrorIcon /> : undefined}
                sx={{ borderRadius: 3 }}
              >
                {statusMessage.text}
              </Alert>
            )}

            {uploading && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!file || uploading}
              onClick={handleUpload}
              sx={{ mt: 2 }}
            >
              {uploading ? 'Processando Arquivo...' : 'Importar e Processar'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
