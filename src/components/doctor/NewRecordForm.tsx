'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecord } from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';
import { STELLAR_CONFIG } from '@/lib/stellar';
import { TransactionBuilder, Networks, Operation, Asset, Memo } from '@stellar/stellar-sdk';


interface Props {
  patientAddress: string;
  onSuccess: () => void;
}

export default function NewRecordForm({ patientAddress, onSuccess }: Props) {
  const { publicKey } = useWalletStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ diagnosis: '', prescription: '', notes: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      const record = await createRecord({ patientAddress, ...form });

      // Build a minimal Stellar tx as on-chain proof
      if (window.freighter && publicKey) {
        const server = new (await import('@stellar/stellar-sdk')).Horizon.Server(STELLAR_CONFIG.horizonUrl);
        const account = await server.loadAccount(publicKey);
        const tx = new TransactionBuilder(account, {
          fee: '100',
          networkPassphrase: STELLAR_CONFIG.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        })
          .addOperation(Operation.payment({
            destination: patientAddress,
            asset: Asset.native(),
            amount: '0.0000001',
          }))
          .addMemo(Memo.text(`record:${record.id}`))
          .setTimeout(30)
          .build();

        const signed = await window.freighter.signTransaction(tx.toXDR(), {
          networkPassphrase: STELLAR_CONFIG.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        });
        const server2 = new (await import('@stellar/stellar-sdk')).Horizon.Server(STELLAR_CONFIG.horizonUrl);
        await server2.submitTransaction(
          (await import('@stellar/stellar-sdk')).TransactionBuilder.fromXDR(
            signed,
            STELLAR_CONFIG.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
          )
        );
      }

      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setForm({ diagnosis: '', prescription: '', notes: '' });
      onSuccess();
    },
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Diagnosis *</label>
        <input
          required
          value={form.diagnosis}
          onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Prescription</label>
        <input
          value={form.prescription}
          onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-600">Failed to submit record. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {mutation.isPending ? 'Submitting…' : 'Submit Record'}
      </button>
    </form>
  );
}
