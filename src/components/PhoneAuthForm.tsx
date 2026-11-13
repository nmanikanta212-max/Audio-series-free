import type { ConfirmationResult } from 'firebase/auth';
import { CheckCircle2, Phone, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { normalizePhoneNumber, sendPhoneOtp, verifyPhoneOtp, type VerifyOtpResult } from '../lib/phoneAuth';

interface PhoneAuthFormProps {
  onSuccess: (result: VerifyOtpResult) => void | Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

export function PhoneAuthForm({
  onSuccess,
  submitLabel = 'Verify & Sign In Permanently',
  disabled = false,
}: PhoneAuthFormProps) {
  const uid = useId().replace(/:/g, '');
  const recaptchaId = `recaptcha-phone-${uid}`;

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [step, setStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [sentPhone, setSentPhone] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (disabled) {
      setError('Please accept Terms of Service & Privacy Policy above first.');
      return;
    }
    setError(null);
    const normalized = normalizePhoneNumber(countryCode, phoneDigits);
    if (!normalized) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPhoneOtp(normalized, recaptchaId);
      if (!res.ok || !res.phoneNumber) {
        setError(res.error || 'Failed to send verification code.');
        return;
      }
      setSentPhone(res.phoneNumber);
      setConfirmationResult(res.confirmationResult ?? null);
      setOtpPreview(res.otpPreview ?? null);
      setStep('enter_otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyPhoneOtp({
        phoneNumber: sentPhone,
        otp: otpInput,
        confirmationResult,
      });
      if (!res.ok) {
        setError(res.error || 'Verification failed.');
        return;
      }
      await onSuccess(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4">
      <div id={recaptchaId} className="hidden" />
      <div className="flex items-center gap-2 text-xs font-semibold text-orange-500">
        <Phone className="h-4 w-4" />
        <span>One-Time Phone Login · Permanently Linked to Your Number</span>
      </div>

      {step === 'enter_phone' ? (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              aria-label="Country code"
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-white/15 bg-white dark:bg-[#09090D] px-2.5 text-xs font-semibold text-stone-900 dark:text-white"
            >
              <option value="+91">+91 (IN)</option>
              <option value="+1">+1 (US)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+971">+971 (AE)</option>
              <option value="+65">+65 (SG)</option>
            </select>
            <input
              type="tel"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="min-h-[44px] flex-1 rounded-xl border border-stone-200 dark:border-white/15 bg-white dark:bg-[#09090D] px-3.5 text-sm text-stone-900 dark:text-white"
            />
          </div>
          <button
            type="button"
            disabled={disabled || loading || phoneDigits.replace(/\D/g, '').length < 7}
            onClick={handleSendOtp}
            className="min-h-[44px] w-full rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send One-Time OTP'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
            <span>
              Code sent to <strong className="font-mono text-stone-900 dark:text-white">{sentPhone}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('enter_phone');
                setOtpInput('');
                setOtpPreview(null);
                setError(null);
              }}
              className="text-orange-500 hover:underline"
            >
              Change
            </button>
          </div>

          {otpPreview && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verification OTP: <strong className="font-mono text-sm">{otpPreview}</strong>
              </span>
              <button
                type="button"
                onClick={() => setOtpInput(otpPreview)}
                className="font-semibold underline"
              >
                Auto-fill
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit OTP"
              className="min-h-[44px] flex-1 rounded-xl border border-stone-200 dark:border-white/15 bg-white dark:bg-[#09090D] px-3.5 font-mono text-sm tracking-widest text-stone-900 dark:text-white"
            />
            <button
              type="button"
              disabled={disabled || loading || otpInput.length < 4}
              onClick={handleVerify}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? 'Verifying...' : submitLabel}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
}
