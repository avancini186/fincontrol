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
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import CheckCircle from '@mui/icons-material/CheckCircle';
import type { PageType } from '../types';
import { supabase } from '../supabaseClient';
import { parseNubankCSV, parseNubankPDFText } from '../parsers/nubank';
import { parseBBCSV } from '../parsers/bb';
import { tokens } from '../design-system/tokens';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface UploadPageProps {
  onNavigate: (page: PageType) => void;
}

interface UploadHistoryItem {
  id: string;
  file_name: string;
  created_at: string;
  status: string;
}

const parseNumericValue = (val: string): number => {
  const cleanVal = val.replace(/\s/g, '').trim();
  
  if (cleanVal.includes(',') && cleanVal.includes('.')) {
    const commaPos = cleanVal.indexOf(',');
    const dotPos = cleanVal.indexOf('.');
    if (commaPos > dotPos) {
      return parseFloat(cleanVal.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(cleanVal.replace(/,/g, '')) || 0;
    }
  }
  
  if (cleanVal.includes(',')) {
    return parseFloat(cleanVal.replace(',', '.')) || 0;
  }
  
  return parseFloat(cleanVal) || 0;
};

export default function UploadPage({ onNavigate }: UploadPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Selecionar Conta', 'Enviar Arquivo', 'Processamento', 'Confirmação'];

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('statements')
        .select('id, file_name, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de upload:', err);
    }
  };

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
    fetchHistory();
  }, []);

  const ensureStorageBucket = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === 'statements');
      if (!exists) {
        await supabase.storage.createBucket('statements', {
          public: false,
          allowedMimeTypes: ['text/csv', 'application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/x-ofx'],
          fileSizeLimit: 10485760
        });
      }
    } catch (err) {
      console.warn('Nota: Bucket statements já existente ou erro de permissão.');
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

      const amount = parseNumericValue(trnamt);
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
    setActiveStep(1); // Progress to step 2: upload
  };

  const handleUpload = async () => {
    if (!file || !selectedAccount) return;

    setUploading(true);
    setActiveStep(2); // Step 3: processing
    setUploadProgress(15);
    setStatusMessage({ type: 'info', text: 'Preparando upload...' });

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let pdfText = '';
      if (fileExtension === 'pdf') {
        try {
          pdfText = await extractTextFromPDF(file);
        } catch (pdfErr) {
          console.error('Erro na extração local de PDF:', pdfErr);
        }
      }

      await ensureStorageBucket();
      setUploadProgress(35);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const filePath = `${userId}/${Date.now()}_${file.name}`;
      setStatusMessage({ type: 'info', text: 'Enviando arquivo para o armazenamento seguro...' });
      
      let contentType = file.type;
      let fileToUpload = file;
      if (fileExtension === 'ofx') {
        contentType = 'text/plain';
        fileToUpload = new File([file], file.name, { type: 'text/plain' });
      } else if (fileExtension === 'csv') {
        contentType = 'text/csv';
        fileToUpload = new File([file], file.name, { type: 'text/csv' });
      }

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, fileToUpload, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: contentType || undefined
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

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
      setUploadProgress(80);

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
      } else if (fileExtension === 'csv') {
        try {
          const text = await file.text();
          const firstLine = text.split(/\r?\n/)[0]?.toLowerCase() || '';
          let parsed: any[] = [];
          const currentUserName = userData.user?.user_metadata?.full_name || 'André Luís Augusto Avancini';
          
          if (firstLine.includes('detalhes') || firstLine.includes('lançamento') || firstLine.includes('lancamento') || firstLine.includes('nº documento')) {
            setStatusMessage({ type: 'info', text: 'Processando arquivo CSV do Banco do Brasil...' });
            parsed = parseBBCSV(text, userId, selectedAccount, statement.id, currentUserName);
          } else {
            setStatusMessage({ type: 'info', text: 'Processando arquivo CSV do Nubank...' });
            parsed = parseNubankCSV(text, userId, selectedAccount, statement.id, currentUserName);
          }
          
          localTransactions = parsed.map(tx => ({
            ...tx,
            user_id: userId,
            account_id: selectedAccount,
            statement_id: statement.id
          }));
          parsedLocally = true;
        } catch (csvErr) {
          console.error('Erro ao parsear arquivo CSV:', csvErr);
        }
      } else if (fileExtension === 'pdf' && pdfText) {
        try {
          setStatusMessage({ type: 'info', text: 'Processando extrato PDF do Nubank...' });
          const currentUserName = userData.user?.user_metadata?.full_name || 'André Luís Augusto Avancini';
          const parsed = parseNubankPDFText(pdfText, userId, selectedAccount, statement.id, currentUserName);
          localTransactions = parsed.map(tx => ({
            ...tx,
            user_id: userId,
            account_id: selectedAccount,
            statement_id: statement.id
          }));
          parsedLocally = true;
        } catch (pdfLocalErr) {
          console.error('Erro ao parsear PDF do Nubank localmente:', pdfLocalErr);
        }
      }

      if (parsedLocally) {
        if (localTransactions.length > 0) {
          setStatusMessage({ type: 'info', text: 'Verificando transações duplicadas...' });
          const { data: existingTx, error: fetchTxErr } = await supabase
            .from('transactions')
            .select('date, amount, raw_description')
            .eq('account_id', selectedAccount);

          if (fetchTxErr) throw fetchTxErr;

          const existingMap = new Set(
            (existingTx || []).map(tx => `${tx.date}_${tx.amount}_${tx.raw_description.trim()}`)
          );

          const uniqueLocalTransactions = localTransactions.filter(tx => {
            const key = `${tx.date}_${tx.amount}_${tx.raw_description.trim()}`;
            return !existingMap.has(key);
          });

          const duplicatesCount = localTransactions.length - uniqueLocalTransactions.length;

          if (uniqueLocalTransactions.length > 0) {
            const { error: insertErr } = await supabase.from('transactions').insert(uniqueLocalTransactions);
            if (insertErr) throw insertErr;
            await supabase.from('statements').update({ status: 'done' }).eq('id', statement.id);
            
            setStatusMessage({ 
              type: 'success', 
              text: `Sucesso! ${uniqueLocalTransactions.length} novos lançamentos importados (${duplicatesCount} duplicatas ignoradas).` 
            });
          } else {
            await supabase.from('statements').update({ status: 'done' }).eq('id', statement.id);
            setStatusMessage({ 
              type: 'info', 
              text: `Todos os ${localTransactions.length} lançamentos deste arquivo já existiam no banco de dados.` 
            });
          }
        } else {
          throw new Error('Nenhuma transação identificada no extrato.');
        }
      } else {
        setStatusMessage({ type: 'info', text: 'Processando com inteligência artificial...' });
        const { error: functionError } = await supabase.functions.invoke('parse-statement', {
          body: { statementId: statement.id }
        });
        if (functionError) throw functionError;
      }

      setUploadProgress(100);
      setActiveStep(3); // Step 4: confirmation
      fetchHistory();
      
      setTimeout(() => {
        onNavigate('review');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Falha no processamento. Tente novamente.' });
      setActiveStep(1);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 1 }}>Importar Extrato</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Siga o fluxo para carregar e processar automaticamente os extratos ou faturas da sua conta.
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Stepper Wizard Indicator */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.8rem', mt: 0.5 } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
              {/* Step 1: Select Account */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2 }}>Selecione a Conta de Destino</Typography>
                  <TextField
                    select
                    label="Conta / Cartão"
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
                  <Button variant="contained" color="primary" sx={{ mt: 3, float: 'right' }} onClick={() => setActiveStep(1)}>
                    Continuar
                  </Button>
                </Box>
              )}

              {/* Step 2: Drag/drop or upload file */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2 }}>Faça o Upload do Arquivo</Typography>
                  <Box
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    sx={{
                      border: '2px dashed rgba(255, 255, 255, 0.12)',
                      borderColor: dragActive ? 'primary.main' : 'rgba(255,255,255,0.12)',
                      borderRadius: 4,
                      p: 5,
                      textAlign: 'center',
                      bgcolor: dragActive ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
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
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Arraste seu extrato aqui ou clique para selecionar
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Formatos aceitos: CSV, PDF, JPG, PNG ou OFX (Max 10MB)
                    </Typography>
                  </Box>

                  {file && (
                    <List sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, p: 1, mt: 2 }}>
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
                    <Alert severity={statusMessage.type} sx={{ borderRadius: 3, mt: 2 }}>
                      {statusMessage.text}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 3 }}>
                    <Button variant="outlined" onClick={() => setActiveStep(0)}>
                      Voltar
                    </Button>
                    <Button variant="contained" disabled={!file || uploading} onClick={handleUpload}>
                      {uploading ? 'Processando...' : 'Importar e Processar'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 3: Processing */}
              {activeStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                  <Typography variant="h3" sx={{ mb: 1 }}>Processando seu arquivo...</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Por favor, aguarde enquanto extraímos e consolidamos os lançamentos.
                  </Typography>
                  <Box sx={{ width: '80%', mx: 'auto', mt: 1 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  {statusMessage && (
                    <Alert severity="info" sx={{ width: '80%', mx: 'auto', mt: 3, borderRadius: 3 }}>
                      {statusMessage.text}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Step 4: Success confirmation */}
              {activeStep === 3 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: tokens.colors.semantic.income, mb: 2 }} />
                  <Typography variant="h3" sx={{ mb: 1 }}>Importação Concluída com sucesso!</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Todos os lançamentos válidos foram importados. Redirecionando para a tela de revisão...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Upload History List */}
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Últimos Arquivos Importados</Typography>
            <Paper variant="outlined" sx={{ border: `1px solid ${tokens.colors.neutral.border}`, borderRadius: 3, bgcolor: tokens.colors.neutral.surface, p: 2 }}>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Nenhum arquivo importado recentemente.
                </Typography>
              ) : (
                <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {history.map((h, i) => (
                    <React.Fragment key={h.id}>
                      {i > 0 && <Divider sx={{ opacity: 0.05 }} />}
                      <ListItem sx={{ py: 1, px: 1, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <InsertDriveFile sx={{ color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{h.file_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(h.created_at).toLocaleDateString('pt-BR')} às {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={h.status === 'done' ? 'Processado' : h.status === 'pending' ? 'Aguardando Revisão' : 'Erro'} 
                          color={h.status === 'done' ? 'success' : h.status === 'pending' ? 'warning' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '11px' }}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}
