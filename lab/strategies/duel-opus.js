// Trend-aligned shock reversion for SOL on 15m candles.
// Buys sharp dips inside an uptrend and shorts sharp rallies inside a downtrend, exits quickly on the
// snap-back (partial retrace of the shock), on a time stop, or via the desk's stop / TP / trail.
module.exports = {
  label: 'Trend-aligned shock fade',
  desc: 'Uptrend (slow EMA rising): buy a sharp, fast drop once it turns up; downtrend: short a sharp, fast rally once it turns down. ' +
    'Shock sized in pre-shock ATR x sqrt(bars). Skips flat markets (weak trend slope or volatility below its daily norm). ' +
    'Exits on a partial retrace of the shock, a few-hour time stop or the desk stop; pauses after repeated daily losses.',
  // [min, max, step]; the desk also adds stopATR, tpATR, trailATR, risk
  space: {
    trend: [100, 400, 10],     // slow EMA length defining the bigger trend (200 x 15m ~ 2 days)
    minSlope: [0.1, 1.5, 0.05],// trend EMA change over 4h, in ATRs, needed to call it a trend (flat filter)
    win: [3, 16, 1],           // "short time": bars the shock must happen within (8 = 2h)
    shock: [0.8, 2.5, 0.05],   // shock size in pre-shock ATR * sqrt(win)
    retrace: [0.3, 0.8, 0.05], // take profit once price has won back this fraction of the shock
    hold: [4, 16, 1],          // time stop in bars (16 x 15m = 4h)
    volMin: [0.5, 1.3, 0.05],  // pre-shock ATR / its 1-day average; below this the market is "boring"
    maxLoss: [2, 5, 1],        // losing trades allowed per rolling 24h before the bot sits out
  },
  warm: p => Math.min(590, Math.max(160, p.trend + p.win + 40)),

  decide(D, p, d, st) {
    const c = D.c, i = D.i, SLOPE = 16, DAY = 96;
    st.bar = (st.bar || 0) + 1; // monotonic bar counter (D.i may stop growing once the window is full)
    const now = st.bar;
    if (!st.losses) st.losses = [];

    // ---- book-keeping: detect a position the desk closed (stop / TP / trail) and score it
    if (st.pos && d === 0) {
      if (st.pos * (c[i] - st.entryPx) < 0) st.losses.push(now);
      st.pos = 0;
    }
    st.losses = st.losses.filter(b => now - b < DAY);

    // ---- managing an open position
    if (d !== 0) {
      if (st.pos !== d) { st.pos = d; st.entryBar = now; st.entryPx = c[i]; st.target = null; } // unknown origin: adopt it
      const held = now - st.entryBar;
      const hit = st.target !== null && (d > 0 ? c[i] >= st.target : c[i] <= st.target);
      const out = why => {
        if (d * (c[i] - st.entryPx) < 0) st.losses.push(now);
        st.pos = 0;
        return { want: 0, why };
      };
      if (hit) return out(d > 0 ? 'bounce target reached' : 'pullback target reached');
      if (held >= p.hold) return out(`time stop after ${held} bars`);
      return { want: null, why: `holding ${held}/${p.hold} bars` };
    }

    // ---- flat: look for a setup
    if (st.losses.length >= p.maxLoss) return { want: null, why: `paused: ${st.losses.length} losses in 24h` };

    const W = p.win, k = i - W; // k = last bar before the shock window
    if (k - SLOPE < 0) return { want: null, why: 'warming' };
    const e = I.ema(c, p.trend), refATR = D.atr[k];
    // 1-day average ATR ending at k (manual: D.atr starts with NaNs, which a running SMA would carry forever)
    let aSum = 0, aN = 0;
    for (let j = Math.max(0, k - DAY + 1); j <= k; j++) if (fin(D.atr[j])) { aSum += D.atr[j]; aN++; }
    const atrAvg = aN >= DAY / 2 ? aSum / aN : NaN;
    if (!fin(e[k]) || !fin(e[k - SLOPE]) || !fin(refATR) || refATR <= 0 || !fin(atrAvg)) return { want: null, why: 'warming' };

    // Bigger trend, measured before the shock so the shock itself cannot flip it.
    const slope = (e[k] - e[k - SLOPE]) / refATR;
    const trend = slope >= p.minSlope ? 1 : slope <= -p.minSlope ? -1 : 0;
    if (trend === 0) return { want: null, why: `flat: slope ${slope.toFixed(2)} ATR` };
    const vol = refATR / atrAvg;
    if (vol < p.volMin) return { want: null, why: `boring: vol ${vol.toFixed(2)}x` };

    // Shock inside the window: extreme close before the move, then the opposite extreme after it.
    const need = p.shock * Math.sqrt(W) * refATR;
    let ext = k, ext2 = k; // ext = start of move (peak for a drop, low for a rally), ext2 = end of move
    for (let j = k; j <= i; j++) if (trend > 0 ? c[j] > c[ext] : c[j] < c[ext]) ext = j;
    ext2 = ext;
    for (let j = ext; j <= i; j++) if (trend > 0 ? c[j] < c[ext2] : c[j] > c[ext2]) ext2 = j;
    const move = trend * (c[ext] - c[ext2]); // positive size of the counter-trend shock
    const startAbs = now - (i - ext);
    const turned = trend > 0 ? c[i] > c[i - 1] : c[i] < c[i - 1];
    const fresh = i - ext2 >= 1 && i - ext2 <= 2; // extreme was 1-2 bars ago and price has just turned
    const room = trend * (c[i] - c[ext2]) < 0.5 * p.retrace * move; // most of the snap-back still ahead
    const sideOK = trend > 0 ? c[ext] > e[k] : c[ext] < e[k]; // shock started on the trend side of the EMA

    if (move >= need && turned && fresh && room && sideOK && st.lastShock !== startAbs) {
      st.lastShock = startAbs; // one trade per shock
      st.pos = trend; st.entryBar = now; st.entryPx = c[i];
      st.target = c[ext2] + trend * p.retrace * move;
      const size = (move / refATR).toFixed(1);
      return trend > 0
        ? { want: 1, why: `uptrend dip of ${size} ATR turned up` }
        : { want: -1, why: `downtrend rally of ${size} ATR turned down` };
    }
    return { want: null, why: trend > 0 ? 'uptrend, waiting for a sharp dip' : 'downtrend, waiting for a sharp rally' };
  },
};
