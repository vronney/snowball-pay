'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type Phase, type DocType, type ExtractedData, type StatementData, type SimpleData,
  type ExtractedDebt, type ExtractedIncome,
  VALID_DEBT_CATEGORIES,
} from '@/components/document/DocumentImportHelpers';
import {
  SuccessPhase, LoadingPhase, StatementReviewPhase, SimpleReviewPhase, UploadPhase,
} from '@/components/document/DocumentImportPhases';

export default function DocumentImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [docType, setDocType] = useState<DocType>('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [selectedItems, setSelectedItems] = useState<boolean[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => /\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name));
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
    setError('');
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!files.length || !docType) { setError('Select files and a document type first'); return; }
    const totalMB = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
    if (totalMB > 90) { setError(`Total file size is ${totalMB.toFixed(0)} MB — please keep it under 90 MB. Try splitting into two batches.`); return; }

    setError('');
    setPhase('analyzing');
    try {
      const formData = new FormData();
      formData.append('fileType', docType);
      files.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'Upload failed'); }

      const { extractedData: data } = await res.json();
      const hasData = data?.type === 'statement' ? data.recurringCharges?.length > 0 : data?.items?.length > 0;
      if (!hasData) { setError('No financial data could be extracted. Please try a clearer image or different file.'); setPhase('error'); return; }

      const itemCount = data.type === 'statement' ? data.recurringCharges.length : data.items.length;
      setExtractedData(data);
      setSelectedItems(Array(itemCount).fill(true));
      setPhase('review');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to process documents.');
      setPhase('error');
    }
  };

  const handleConfirmImport = async () => {
    if (!extractedData) return;
    setPhase('saving');
    let count = 0;
    try {
      if (extractedData.type === 'statement') {
        const charges = extractedData.recurringCharges;
        for (let i = 0; i < charges.length; i++) {
          if (!selectedItems[i]) continue;
          const c = charges[i];
          const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: c.name, amount: c.monthlyAmount, frequency: 'monthly', category: c.category || 'other' }) });
          if (res.ok) count++;
          else console.error('Failed to save expense:', c.name, await res.json().catch(() => ({})));
        }
        const essentialTotal = charges.filter((c, i) => selectedItems[i] && c.isEssential).reduce((sum, c) => sum + c.monthlyAmount, 0);
        if (essentialTotal > 0) {
          const incomeRes = await fetch('/api/income').catch(() => null);
          const incomeBody = incomeRes?.ok ? await incomeRes.json().catch(() => ({})) : {};
          const existing = incomeBody?.income;
          await fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyTakeHome: existing?.monthlyTakeHome ?? 0, essentialExpenses: (existing?.essentialExpenses ?? 0) + essentialTotal, extraPayment: existing?.extraPayment ?? 0, source: existing?.source ?? '', frequency: existing?.frequency ?? 'monthly' }) });
          queryClient.invalidateQueries({ queryKey: ['income'] });
        }
        queryClient.invalidateQueries({ queryKey: ['expenses'] });

      } else if (extractedData.type === 'debt') {
        const debts = extractedData.items as ExtractedDebt[];
        for (let i = 0; i < debts.length; i++) {
          if (!selectedItems[i]) continue;
          const d = debts[i];
          const res = await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: d.name || 'Unknown Debt', category: VALID_DEBT_CATEGORIES.includes(d.category) ? d.category : 'Other', balance: d.balance || 0, interestRate: d.interestRate || 0, minimumPayment: d.minimumPayment || 0, creditLimit: d.creditLimit || 0, dueDate: d.dueDate ?? undefined }) });
          if (res.ok) count++;
          else console.error('Failed to save debt:', d.name, await res.json().catch(() => ({})));
        }
        queryClient.invalidateQueries({ queryKey: ['debts'] });

      } else if (extractedData.type === 'income') {
        const incomes = extractedData.items as ExtractedIncome[];
        for (let i = 0; i < incomes.length; i++) {
          if (!selectedItems[i]) continue;
          const inc = incomes[i];
          const res = await fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyTakeHome: inc.monthlyTakeHome || 0, essentialExpenses: 0, extraPayment: 0, source: inc.source || '', frequency: inc.frequency || 'monthly' }) });
          if (res.ok) count++;
          else console.error('Failed to save income:', await res.json().catch(() => ({})));
        }
        queryClient.invalidateQueries({ queryKey: ['income'] });
      }

      setSavedCount(count);
      setPhase('success');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save some items. Please try again.');
      setPhase('error');
    }
  };

  const handleReset = () => {
    setFiles([]); setDocType(''); setPhase('idle'); setError('');
    setExtractedData(null); setSelectedItems([]); setSavedCount(0);
  };

  const toggleItem = (i: number) => setSelectedItems((prev) => prev.map((v, idx) => idx === i ? !v : v));
  const checkedCount = selectedItems.filter(Boolean).length;

  if (phase === 'success') {
    const isStatement = extractedData?.type === 'statement';
    const isDebt = extractedData?.type === 'debt';
    const noun = isStatement ? `recurring expense${savedCount !== 1 ? 's' : ''}` : isDebt ? `debt${savedCount !== 1 ? 's' : ''}` : 'income record';
    const essentialCount = isStatement ? (extractedData as StatementData).recurringCharges.filter((c, i) => selectedItems[i] && c.isEssential).length : 0;
    return <SuccessPhase savedCount={savedCount} noun={noun} essentialCount={essentialCount} isStatement={isStatement} onReset={handleReset} />;
  }

  if (phase === 'analyzing' || phase === 'saving') {
    return <LoadingPhase phase={phase} docType={docType} files={files} />;
  }

  if (phase === 'review' && extractedData?.type === 'statement') {
    return <StatementReviewPhase data={extractedData as StatementData} selectedItems={selectedItems} checkedCount={checkedCount} onSelect={setSelectedItems} onToggle={toggleItem} onConfirm={handleConfirmImport} onReset={handleReset} />;
  }

  if (phase === 'review' && extractedData && (extractedData.type === 'debt' || extractedData.type === 'income')) {
    return <SimpleReviewPhase data={extractedData as SimpleData} selectedItems={selectedItems} checkedCount={checkedCount} onToggle={toggleItem} onConfirm={handleConfirmImport} onReset={handleReset} />;
  }

  return <UploadPhase docType={docType} setDocType={setDocType} files={files} dragActive={dragActive} error={error} fileInputRef={fileInputRef} onDrag={handleDrag} onDrop={handleDrop} onFileInput={handleFileInput} onRemoveFile={removeFile} onUpload={handleUpload} />;
}
