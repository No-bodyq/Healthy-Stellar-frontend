'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { encryptFile, exportKey, hashBuffer } from '@/lib/crypto';
import { uploadEncryptedRecord } from '@/services/api.service';
import { useToast } from '@/hooks/useToast';
import { EncryptedRecord } from '@/types';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface Props {
  patientAddress: string;
  onUploaded?: (record: EncryptedRecord) => void;
}

export default function MedicalRecordUpload({ patientAddress, onUploaded }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<'idle' | 'encrypting' | 'uploading'>('idle');

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate
      if (!ACCEPTED.includes(file.type)) {
        throw new Error('Unsupported file type. Please upload a PDF, JPEG, or PNG.');
      }
      if (file.size > MAX_BYTES) {
        throw new Error('File exceeds the 10 MB limit.');
      }

      // Encrypt
      setProgress('encrypting');
      const { encryptedBuffer, iv, key } = await encryptFile(file);
      const exportedKey = await exportKey(key);
      const contentHash = await hashBuffer(encryptedBuffer);

      // Build FormData
      setProgress('uploading');
      const formData = new FormData();
      formData.append('patientAddress', patientAddress);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('contentHash', contentHash);
      formData.append('encryptedFile', new Blob([encryptedBuffer]), file.name);
      formData.append('iv', new Blob([iv.buffer as ArrayBuffer]));
      formData.append('exportedKey', new Blob([exportedKey as ArrayBuffer]));

      return uploadEncryptedRecord(formData);
    },
    onSuccess: (record) => {
      setProgress('idle');
      toast('Record uploaded and encrypted successfully.', 'success');
      // Optimistic: invalidate records query so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['encryptedRecords', patientAddress] });
      onUploaded?.(record);
      if (inputRef.current) inputRef.current.value = '';
    },
    onError: (err: Error) => {
      setProgress('idle');
      toast(err.message || 'Upload failed. Please try again.', 'error');
      console.error('[MedicalRecordUpload]', err);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) mutation.mutate(file);
  }

  const busy = mutation.isPending;

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
      <p className="text-3xl mb-2">🔒</p>
      <p className="font-medium text-slate-700">Upload Encrypted Medical Record</p>
      <p className="text-xs text-slate-400 mt-1">PDF, JPEG or PNG · max 10 MB · encrypted before upload</p>

      {progress !== 'idle' && (
        <p className="mt-3 text-sm text-blue-600 animate-pulse">
          {progress === 'encrypting' ? 'Encrypting file…' : 'Uploading…'}
        </p>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {busy ? 'Processing…' : 'Choose File'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
