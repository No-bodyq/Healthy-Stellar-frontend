'use client';

import { useState } from 'react';
import { useWalletStore } from '@/store/useWalletStore';
import { UserRole } from '@/types';
import api from '@/services/api.service';

interface Props {
  onClose: () => void;
}

type WalletOption = 'freighter' | 'albedo';


export default function ConnectWalletModal({ onClose }: Props) {
  const { setWallet, network } = useWalletStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<WalletOption | null>(null);

  async function connectFreighter() {
    if (!window.freighter) {
      setError('Freighter extension not installed. Please install it from freighter.app');
      return;
    }
    setLoading('freighter');
    setError(null);
    try {
      const walletNetwork = await window.freighter.getNetwork();
      if (walletNetwork.toLowerCase() !== network.toLowerCase()) {
        setError(`Network mismatch. Switch Freighter to ${network}.`);
        return;
      }
      const publicKey = await window.freighter.getPublicKey();
      const { data } = await api.get<{ role: UserRole }>(`/users/${publicKey}/role`);
      setWallet(publicKey, data.role);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('rejected') ? 'Connection rejected by user.' : 'Failed to connect Freighter.');
    } finally {
      setLoading(null);
    }
  }

  async function connectAlbedo() {
    if (!window.albedo) {
      setError('Albedo not available. Please visit albedo.link');
      return;
    }
    setLoading('albedo');
    setError(null);
    try {
      const { pubkey } = await window.albedo.publicKey({});
      const { data } = await api.get<{ role: UserRole }>(`/users/${pubkey}/role`);
      setWallet(pubkey, data.role);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('rejected') ? 'Connection rejected by user.' : 'Failed to connect Albedo.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Connect Wallet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={connectFreighter}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {loading === 'freighter' ? 'Connecting…' : '🔑 Freighter'}
          </button>
          <button
            onClick={connectAlbedo}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {loading === 'albedo' ? 'Connecting…' : '🌐 Albedo'}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">Network: {network}</p>
      </div>
    </div>
  );
}
