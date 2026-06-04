'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DoctorSearch from '@/components/appointments/DoctorSearch';
import SlotPicker from '@/components/appointments/SlotPicker';
import BookingConfirmation from '@/components/appointments/BookingConfirmation';
import UpcomingAppointments from '@/components/appointments/UpcomingAppointments';
import { createAppointment } from '@/services/api.service';
import { useWalletStore } from '@/store/useWalletStore';
import { STELLAR_CONFIG } from '@/lib/stellar';
import { Doctor, TimeSlot, Appointment } from '@/types';
import { TransactionBuilder, Networks, Operation, Asset } from '@stellar/stellar-sdk';


type Step = 'search' | 'slots' | 'form' | 'confirmed';

function BookingFlow() {
  const { publicKey } = useWalletStore();
  const [step, setStep] = useState<Step>('search');
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState({ type: 'in-person' as 'in-person' | 'telemedicine', notes: '', paymentMethod: 'stellar' as 'stellar' | 'traditional' });
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const FEE = 10; // XLM

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!doctor || !slot || !publicKey) throw new Error('Missing data');

      if (form.paymentMethod === 'stellar' && window.freighter) {
        const server = new (await import('@stellar/stellar-sdk')).Horizon.Server(STELLAR_CONFIG.horizonUrl);
        const account = await server.loadAccount(publicKey);
        const tx = new TransactionBuilder(account, {
          fee: '100',
          networkPassphrase: STELLAR_CONFIG.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
        })
          .addOperation(Operation.payment({
            destination: doctor.address,
            asset: Asset.native(),
            amount: String(FEE),
          }))
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

      return createAppointment({
        doctorId: doctor.id,
        doctorName: doctor.name,
        patientAddress: publicKey,
        datetime: slot.datetime,
        type: form.type,
        notes: form.notes,
        fee: FEE,
      });
    },
    onSuccess: (appt) => {
      setConfirmed(appt);
      setStep('confirmed');
    },
  });

  if (step === 'confirmed' && confirmed) {
    return (
      <BookingConfirmation
        appointment={confirmed}
        onDone={() => { setStep('search'); setDoctor(null); setSlot(null); setConfirmed(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {(['search', 'slots', 'form'] as Step[]).map((s, i) => (
          <span key={s} className={`flex items-center gap-1 ${step === s ? 'text-blue-600 font-medium' : ''}`}>
            {i > 0 && <span>›</span>}
            {s === 'search' ? 'Find Doctor' : s === 'slots' ? 'Pick Slot' : 'Book & Pay'}
          </span>
        ))}
      </div>

      {step === 'search' && (
        <DoctorSearch onSelect={(d) => { setDoctor(d); setStep('slots'); }} />
      )}

      {step === 'slots' && doctor && (
        <div>
          <button onClick={() => setStep('search')} className="text-xs text-slate-400 hover:text-slate-600 mb-3">← Back</button>
          <p className="font-semibold text-slate-900 mb-4">Dr. {doctor.name} — {doctor.specialty}</p>
          <SlotPicker doctorId={doctor.id} selected={slot} onSelect={setSlot} />
          {slot && (
            <button
              onClick={() => setStep('form')}
              className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {step === 'form' && doctor && slot && (
        <div>
          <button onClick={() => setStep('slots')} className="text-xs text-slate-400 hover:text-slate-600 mb-3">← Back</button>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Appointment Type</label>
              <div className="flex gap-3">
                {(['in-person', 'telemedicine'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={form.type === t}
                      onChange={() => setForm((f) => ({ ...f, type: t }))}
                    />
                    {t === 'in-person' ? 'In-Person' : 'Telemedicine'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
              <div className="flex gap-3">
                {(['stellar', 'traditional'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      value={m}
                      checked={form.paymentMethod === m}
                      onChange={() => setForm((f) => ({ ...f, paymentMethod: m }))}
                    />
                    {m === 'stellar' ? `Stellar (${FEE} XLM)` : 'Traditional'}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-600">
                <span className="font-medium">Dr. {doctor.name}</span> · {new Date(slot.datetime).toLocaleString()}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Fee: {FEE} XLM</p>
            </div>

            {bookMutation.isError && (
              <p className="text-xs text-red-600">Booking failed. Please try again.</p>
            )}

            <button
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {bookMutation.isPending ? 'Processing…' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute requiredRole="PATIENT">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Book an Appointment</h1>
          <BookingFlow />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Appointments</h2>
          <UpcomingAppointments />
        </div>
      </div>
    </ProtectedRoute>
  );
}
