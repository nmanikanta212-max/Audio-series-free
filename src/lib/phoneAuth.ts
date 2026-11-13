import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from './firebase';

export function normalizePhoneNumber(countryCode: string, rawInput: string): string {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('+')) {
    const cleaned = `+${trimmed.replace(/\D/g, '')}`;
    return cleaned.length >= 10 && cleaned.length <= 16 ? cleaned : '';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 14) return '';
  const cc = countryCode.startsWith('+') ? countryCode : `+${countryCode.replace(/\D/g, '')}`;
  return `${cc}${digits}`;
}

export interface SendOtpResult {
  ok: boolean;
  mode?: 'firebase' | 'server';
  phoneNumber?: string;
  confirmationResult?: ConfirmationResult;
  otpPreview?: string;
  error?: string;
}

export interface VerifyOtpResult {
  ok: boolean;
  phoneNumber?: string;
  isNewAccount?: boolean;
  account?: Record<string, unknown>;
  error?: string;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<SendOtpResult> {
  if (!phoneNumber) {
    return { ok: false, error: 'Please enter a valid mobile number.' };
  }

  // Attempt Firebase Phone Auth first if reCAPTCHA container is available
  try {
    const containerEl = document.getElementById(recaptchaContainerId);
    if (containerEl) {
      containerEl.innerHTML = '';
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
      });
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return {
        ok: true,
        mode: 'firebase',
        phoneNumber,
        confirmationResult,
      };
    }
  } catch {
    // Firebase Phone Auth unavailable (e.g. SMS/Phone provider disabled or iframe reCAPTCHA blocked)
    // Fall back gracefully to server-verified OTP + permanent phone-bound account ledger
  }

  try {
    const res = await fetch('/api/auth/phone/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not send OTP.' };
    }
    return {
      ok: true,
      mode: 'server',
      phoneNumber: data.phoneNumber,
      otpPreview: data.otpPreview,
    };
  } catch {
    return { ok: false, error: 'Network error while sending OTP.' };
  }
}

export async function verifyPhoneOtp(params: {
  phoneNumber: string;
  otp: string;
  confirmationResult?: ConfirmationResult | null;
}): Promise<VerifyOtpResult> {
  const { phoneNumber, otp, confirmationResult } = params;
  const cleanOtp = otp.trim();
  if (cleanOtp.length < 4) {
    return { ok: false, error: 'Enter the 6-digit verification code.' };
  }

  let firebaseVerified = false;
  if (confirmationResult) {
    try {
      await confirmationResult.confirm(cleanOtp);
      firebaseVerified = true;
    } catch {
      return { ok: false, error: 'Invalid SMS verification code. Please check and try again.' };
    }
  }

  try {
    const res = await fetch('/api/auth/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        otp: cleanOtp,
        firebaseVerified,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Verification failed.' };
    }
    return {
      ok: true,
      phoneNumber: data.phoneNumber,
      isNewAccount: Boolean(data.isNewAccount),
      account: data.account,
    };
  } catch {
    return { ok: false, error: 'Network error while verifying OTP.' };
  }
}
