// Regime-gated dip/rally fader for SOL on 15m candles.
// Trend regime (fast EMA vs slow EMA, in ATRs) decides the side: uptrend -> buy sharp dips, downtrend -> short sharp rallies.
// No trend or dead volatility -> stay out. Short holding time, loss-streak pause for account safety.
module.exports = {
  label: 'Regime dip fader',
  desc: 'In an established uptrend buys sharp short-term drops (in ATRs, with RSI washed out); in a downtrend shorts sharp rallies. Skips flat/low-volatility markets, exits on a bounce back to the fast EMA, a trend flip or a few-hours time stop, and pauses after a losing streak.',
  space: {
    slow: [48, 192, 8],      // slow EMA length in bars (15m: 48 = 12h)
    look: [3, 8, 1],         // bars over which the sharp move is measured
    moveATR: [1.6, 3.5, 0.1],// required drop/rally over look, in ATRs
    trendATR: [0.5, 3, 0.1], // min |fastEMA - slowEMA| in ATRs, else market is trendless
    volMin: [0.6, 1.1, 0.05],// min ATR vs its recent average, else market is too quiet
    rsiX: [20, 40, 1],       // RSI(7) must be at most this for longs, at least 100 - this for shorts
    maxHold: [8, 16, 1],     // time stop in bars (8-16 bars = 2-4 hours)
    cool: [2, 8, 1],         // bars to wait after an exit
    maxLoss: [2, 4, 1],      // consecutive losers before a pause
  },
  warm: p => Math.min(590, Math.round(p.slow) * 2 + 40),
  decide(D, p, d, st) {
    const i = D.i, c = D.c, x = c[i], a = D.atr[i], t = D.t[i];
    const slow = Math.round(p.slow), fastN = Math.max(8, Math.round(slow / 4)), look = Math.round(p.look);
    if (!fin(x) || !fin(a) || a <= 0 || i < slow + look + 5) return { want: null, why: 'warming up' };

    const es = I.ema(c, slow), ef = I.ema(c, fastN), r = I.rsi(c, 7);
    const S = es[i], F = ef[i], R = r[i];
    if (!fin(S) || !fin(F) || !fin(R)) return { want: null, why: 'indicators not ready' };

    // --- bookkeeping: detect positions closed by the desk (stop / tp / trail) and score them ---
    if (d === 0 && st.dir) {
      const won = st.dir * (x - st.px) > 0;
      st.losses = won ? 0 : (st.losses || 0) + 1;
      st.lastExit = t;
      if (st.losses >= Math.round(p.maxLoss)) { st.pauseUntil = t + 16 * 15 * 60000; st.losses = 0; } // ~4h pause
      st.dir = 0;
    }
    if (d !== 0 && !st.dir) { st.dir = d; st.px = x; st.entryT = t; } // adopt a position we did not record

    // --- regime ---
    const gap = (F - S) / a;                        // trend strength in ATRs
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - 96); j <= i; j++) if (fin(D.atr[j])) { sum += D.atr[j]; n++; }
    const volRatio = n ? a / (sum / n) : 0;
    const up = gap >= p.trendATR && x > S && S > es[i - 8];
    const dn = gap <= -p.trendATR && x < S && S < es[i - 8];
    const active = volRatio >= p.volMin;

    // --- exits ---
    if (d !== 0) {
      const bars = Math.round((t - (st.entryT || t)) / (15 * 60000));
      if (bars >= Math.round(p.maxHold)) return { want: 0, why: 'time stop' };
      if (d > 0 && !up && x < S) return { want: 0, why: 'uptrend lost' };
      if (d < 0 && !dn && x > S) return { want: 0, why: 'downtrend lost' };
      if (d > 0 && x >= F && x > st.px) return { want: 0, why: 'bounced to fast EMA' };
      if (d < 0 && x <= F && x < st.px) return { want: 0, why: 'faded to fast EMA' };
      return { want: null, why: 'holding' };
    }

    // --- entries ---
    if (st.pauseUntil && t < st.pauseUntil) return { want: null, why: 'paused after losses' };
    if (st.lastExit && t - st.lastExit < p.cool * 15 * 60000) return { want: null, why: 'cooldown' };
    if (!active) return { want: null, why: 'market too quiet' };

    let hi = -Infinity, lo = Infinity;
    for (let j = i - look; j < i; j++) { hi = Math.max(hi, c[j]); lo = Math.min(lo, c[j]); }
    const drop = (hi - x) / a, rally = (x - lo) / a;

    if (up && drop >= p.moveATR && R <= p.rsiX) {
      st.dir = 1; st.px = x; st.entryT = t;
      return { want: 1, why: 'dip in uptrend ' + drop.toFixed(1) + ' ATR' };
    }
    if (dn && rally >= p.moveATR && R >= 100 - p.rsiX) {
      st.dir = -1; st.px = x; st.entryT = t;
      return { want: -1, why: 'rally in downtrend ' + rally.toFixed(1) + ' ATR' };
    }
    return { want: null, why: up ? 'uptrend, no dip' : dn ? 'downtrend, no rally' : 'no trend' };
  },
};
