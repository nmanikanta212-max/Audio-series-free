import { CheckCircle2, Coins, Crown, ExternalLink, Gift, Megaphone, Receipt, SkipForward, Ticket, Video, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { COIN_PACKS, SPONSORED_ADS } from '../data/catalog';
import type { CoinPack, PromoCoupon, TransactionItem } from '../types';

interface WalletModalProps {
  coins: number;
  isPremium: boolean;
  streakDays: number;
  checkedInToday: boolean;
  transactions: TransactionItem[];
  coupons: PromoCoupon[];
  onClose: () => void;
  onBuyCoins: (pack: CoinPack, method: string) => void;
  onSubscribePremium: (plan: 'monthly' | 'yearly', method: string) => void;
  onDailyCheckIn: () => void;
  onRedeemCoupon: (code: string) => { ok: boolean; message: string };
  onCompleteRewardedAd: (adBrand: string) => void;
}

export function WalletModal({
  coins,
  isPremium,
  streakDays,
  checkedInToday,
  transactions,
  coupons,
  onClose,
  onBuyCoins,
  onSubscribePremium,
  onDailyCheckIn,
  onRedeemCoupon,
  onCompleteRewardedAd,
}: WalletModalProps) {
  const [tab, setTab] = useState<'coins' | 'premium' | 'rewards' | 'history'>('coins');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [adIndex, setAdIndex] = useState(0);
  const [adSeconds, setAdSeconds] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<TransactionItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeAd = SPONSORED_ADS[adIndex % SPONSORED_ADS.length];

  useEffect(() => {
    if (adSeconds === null) return;
    if (adSeconds <= 0) {
      const completedBrand = SPONSORED_ADS[adIndex % SPONSORED_ADS.length].brand;
      setAdSeconds(null);
      onCompleteRewardedAd(completedBrand);
      setToast(`+5 coins credited for watching ${completedBrand} ad`);
      setAdIndex((prev) => (prev + 1) % SPONSORED_ADS.length);
      return;
    }
    const id = window.setTimeout(() => setAdSeconds(adSeconds - 1), 1000);
    return () => window.clearTimeout(id);
  }, [adSeconds, adIndex, onCompleteRewardedAd]);

  const startAdSpot = (idx?: number) => {
    if (typeof idx === 'number') {
      setAdIndex(idx);
    }
    setToast(null);
    setAdSeconds(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#13131A] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Coins className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white">Coin Wallet &amp; Pass</h2>
              <p className="font-mono text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                Balance: {coins.toLocaleString()} coins {isPremium ? '· Premium Unlimited' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close wallet"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-stone-200 dark:border-white/10 px-5 py-2.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'coins', label: 'Buy Coins' },
            { id: 'rewards', label: 'Ads (+5 Coins) & Rewards' },
            { id: 'premium', label: 'Premium Pass' },
            { id: 'history', label: `Invoices (${transactions.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                tab === t.id ? 'bg-orange-500 text-white' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {toast && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}
            </div>
          )}

          {/* Active Sponsored Advertisement Player */}
          {adSeconds !== null && (
            <div className={`rounded-2xl border border-orange-500/40 bg-gradient-to-br ${activeAd.accentFrom} ${activeAd.accentTo} p-5 space-y-4`}>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                  <Megaphone className="h-3.5 w-3.5" /> Sponsored Ad · {activeAd.category}
                </span>
                <span className="font-mono text-xs font-semibold text-white bg-black/40 rounded-lg px-2.5 py-1 tabular-nums">
                  Reward in {adSeconds}s (+5 coins)
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-300">{activeAd.brand}</p>
                <h3 className="mt-0.5 font-display text-lg font-bold text-white">{activeAd.headline}</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-200">{activeAd.tagline}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-lg bg-white/15 px-3 py-1.5 font-mono text-xs font-semibold text-amber-200">
                  {activeAd.offerBadge}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                  {activeAd.ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full bg-orange-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((5 - adSeconds) / 5) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {tab === 'coins' && (
            <>
              {/* Quick Ads for Coins Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-orange-500">Free Coins · 1 Ad = 5 Coins</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300">
                    Watch sponsored ads from {SPONSORED_ADS.length} brands (Audio, Fintech, Travel &amp; more) for +5 coins each.
                  </p>
                </div>
                <button
                  disabled={adSeconds !== null}
                  onClick={() => {
                    setTab('rewards');
                    startAdSpot();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Video className="h-4 w-4" /> Watch Ad (+5 Coins)
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-stone-200 dark:border-white/10 p-3.5">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Payment Method</span>
                <div className="flex gap-1.5">
                  {(['UPI', 'Card', 'NetBanking'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`min-h-[34px] rounded-lg px-3 text-xs font-medium ${
                        paymentMethod === m
                          ? 'bg-orange-500 text-white'
                          : 'border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COIN_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4"
                  >
                    <div>
                      <p className="text-xs font-medium text-orange-500">{pack.label}</p>
                      <p className="mt-1 font-display text-2xl font-bold text-stone-900 dark:text-white tabular-nums">
                        {pack.coins + pack.bonusCoins} Coins
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {pack.coins} base + {pack.bonusCoins} bonus
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onBuyCoins(pack, paymentMethod);
                        setToast(`Purchased ${pack.coins + pack.bonusCoins} coins via ${paymentMethod}`);
                      }}
                      className="mt-4 min-h-[42px] w-full rounded-xl bg-orange-500 text-xs font-semibold text-white hover:bg-orange-400 tabular-nums"
                    >
                      Pay ₹{pack.priceInr} via {paymentMethod}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'premium' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 to-transparent p-5">
                <div className="flex items-center gap-2 text-orange-400">
                  <Crown className="h-5 w-5" />
                  <span className="font-display text-lg font-bold text-stone-900 dark:text-white">
                    KathaStream Unlimited Pass
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                  Unlock every premium episode across all languages, listen ad-free, and enjoy studio lossless streaming.
                </p>
                {isPremium ? (
                  <p className="mt-4 text-sm font-semibold text-emerald-500">Your Premium Pass is currently active.</p>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        onSubscribePremium('monthly', paymentMethod);
                        setToast('Monthly Premium Pass activated');
                      }}
                      className="min-h-[48px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400"
                    >
                      Monthly Plan · ₹149 / mo
                    </button>
                    <button
                      onClick={() => {
                        onSubscribePremium('yearly', paymentMethod);
                        setToast('Annual Premium Pass activated');
                      }}
                      className="min-h-[48px] rounded-xl border border-orange-500 bg-orange-500/10 px-4 text-xs font-semibold text-orange-400 hover:bg-orange-500/20"
                    >
                      Annual Plan · ₹999 / yr (Save 44%)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-4">
              {/* Multi-Sponsor Ads for Coins (1 Ad = 5 Coins) */}
              <div className="rounded-2xl border border-stone-200 dark:border-white/10 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Video className="h-5 w-5 text-orange-500" />
                    <div>
                      <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-white">
                        Watch Ads for Coins (5 Coins per Ad)
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Each ad promotes a different partner brand · Earn +5 coins every time.
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={adSeconds !== null}
                    onClick={() => setAdIndex((prev) => (prev + 1) % SPONSORED_ADS.length)}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-stone-200 dark:border-white/15 px-3 text-xs font-medium text-stone-700 dark:text-stone-300 disabled:opacity-50"
                  >
                    <SkipForward className="h-3.5 w-3.5" /> Next Ad
                  </button>
                </div>

                {/* Featured Ad Card */}
                <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-orange-500">
                      Featured Sponsor · {activeAd.category}
                    </p>
                    <p className="font-display text-sm font-bold text-stone-900 dark:text-white">
                      {activeAd.brand}: {activeAd.headline}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{activeAd.tagline}</p>
                    <p className="font-mono text-[11px] text-emerald-500">{activeAd.offerBadge}</p>
                  </div>
                  <button
                    disabled={adSeconds !== null}
                    onClick={() => startAdSpot(adIndex)}
                    className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white hover:bg-orange-400 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {adSeconds !== null ? `Playing (${adSeconds}s)` : 'Watch Ad (+5 Coins)'}
                  </button>
                </div>

                {/* Browse all Partner Advertisements */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SPONSORED_ADS.map((ad, idx) => (
                    <button
                      key={ad.id}
                      disabled={adSeconds !== null}
                      onClick={() => startAdSpot(idx)}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                        idx === adIndex
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-stone-200 dark:border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-stone-900 dark:text-white">{ad.brand}</p>
                        <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                          {ad.category} · {ad.offerBadge}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold text-orange-500 shrink-0">+5 coins</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Check-in */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <Gift className="h-7 w-7 text-orange-500" />
                  <div>
                    <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-white">
                      Daily Check-In Streak ({streakDays} days)
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Claim +10 bonus coins every day you open KathaStream.
                    </p>
                  </div>
                </div>
                <button
                  disabled={checkedInToday}
                  onClick={() => {
                    onDailyCheckIn();
                    setToast('+10 daily streak coins added');
                  }}
                  className="min-h-[40px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                >
                  {checkedInToday ? 'Claimed Today' : 'Claim +10'}
                </button>
              </div>

              {/* Coupon Redemption */}
              <div className="rounded-2xl border border-stone-200 dark:border-white/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-orange-500" />
                  <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-white">
                    Redeem Promo / Referral Code
                  </h3>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={`Try ${coupons.filter((c) => c.active).map((c) => c.code).join(' or ')}`}
                    className="min-h-[42px] flex-1 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#09090D] px-3.5 font-mono text-xs text-stone-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      const res = onRedeemCoupon(couponInput.trim());
                      setCouponFeedback(res);
                      if (res.ok) setCouponInput('');
                    }}
                    className="min-h-[42px] rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {couponFeedback && (
                  <p className={`text-xs ${couponFeedback.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                    {couponFeedback.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              {selectedInvoice && (
                <div className="rounded-2xl border border-orange-500/40 bg-orange-500/5 p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-stone-900 dark:text-white">
                      Invoice #{selectedInvoice.invoiceId}
                    </span>
                    <button onClick={() => setSelectedInvoice(null)} className="text-stone-400 hover:text-white">
                      Close
                    </button>
                  </div>
                  <p className="text-stone-500 dark:text-stone-300">{selectedInvoice.description}</p>
                  <p className="font-mono text-stone-500 dark:text-stone-400">
                    Date: {new Date(selectedInvoice.createdAt).toLocaleString()} · Method:{' '}
                    {selectedInvoice.paymentMethod || 'Wallet'}
                  </p>
                  <p className="font-semibold text-orange-500 tabular-nums">
                    Coins: {selectedInvoice.amountCoins >= 0 ? `+${selectedInvoice.amountCoins}` : selectedInvoice.amountCoins}
                    {selectedInvoice.amountInr ? ` · Paid ₹${selectedInvoice.amountInr}` : ''}
                  </p>
                </div>
              )}

              {transactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-500">No transactions yet.</p>
              ) : (
                <div className="divide-y divide-stone-200 dark:divide-white/10 rounded-2xl border border-stone-200 dark:border-white/10">
                  {transactions.map((tx) => (
                    <div key={tx.txId} className="flex items-center justify-between gap-3 p-3.5 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900 dark:text-white">{tx.description}</p>
                        <p className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                          {tx.invoiceId} · {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            tx.amountCoins >= 0 ? 'text-emerald-500' : 'text-stone-400'
                          }`}
                        >
                          {tx.amountCoins >= 0 ? `+${tx.amountCoins}` : tx.amountCoins} coins
                        </span>
                        <button
                          onClick={() => setSelectedInvoice(tx)}
                          aria-label="View invoice"
                          className="text-stone-400 hover:text-orange-500"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
