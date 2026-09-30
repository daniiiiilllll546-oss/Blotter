module.exports = {
  label: 'SOL Trend Snapback',

  desc: 'Trades sharp countertrend moves after the first confirming turn, using EMA direction, slope and volatility to reject flat markets. Exits at the bounce EMA, when the trend fades, or after a fixed holding limit; the desk manages sizing and protective stops.',

  space: {
    fast:       [24, 40, 2],
    slow:       [72, 120, 4],
    bounce:     [8, 16, 1],
    slopeBars:  [4, 12, 1],
    shockBars:  [2, 4, 1],
    gapATR:     [0.25, 0.75, 0.05],
    slopeATR:   [0.10, 0.40, 0.05],
    shockATR:   [0.75, 1.75, 0.10],
    stretchATR: [0.10, 0.40, 0.05],
    minAtrPct:  [0.10, 0.30, 0.02],
    maxBars:    [8, 16, 1],
    cooldown:   [1, 3, 1]
  },

  warm(p) {
    return Math.min(590, Math.max(
      30,
      3 * Math.max(p.fast, p.slow, p.bounce)
        + p.slopeBars + p.shockBars + 2
    ));
  },

  decide(D, p, d, st) {
    const s = st.solSnapback || (st.solSnapback = {
      side: 0,
      held: 0,
      cooldown: 0
    });

    // Count closed-candle calls, not array indices: rolling arrays
    // eventually keep the same last index.
    if (s.cooldown > 0) s.cooldown--;

    if (d === 0 && s.side !== 0) {
      // Also catches exits made independently by the desk.
      s.cooldown = Math.max(s.cooldown, p.cooldown);
    }

    s.held = d === 0 ? 0 : (d === s.side ? s.held + 1 : 1);
    s.side = d;

    const exit = why => {
      s.cooldown = p.cooldown + 1;
      return { want: 0, why };
    };

    // Eight to sixteen 15-minute bars = two to four hours.
    if (d !== 0 && s.held >= p.maxBars) {
      return exit('maximum holding time');
    }

    const i = D.i;
    const k = i - 1;
    const origin = k - p.shockBars;
    const needed = 3 * Math.max(p.fast, p.slow, p.bounce)
      + p.slopeBars + p.shockBars + 2;

    if (i + 1 < needed || origin < 0) {
      return d !== 0
        ? exit('insufficient history')
        : { want: 0, why: 'warming up' };
    }

    const c = D.c;
    const x = c[i];
    const a = D.atr[i];

    // Use ATR from before the shock so the shock itself does not
    // inflate its own detection threshold.
    const shockScale = D.atr[origin];
    const valid = n =>
      typeof n === 'number' &&
      n === n &&
      n !== Infinity &&
      n !== -Infinity;

    if (![x, c[k], c[origin], D.h[i], D.l[i], a, shockScale]
      .every(valid) ||
      x <= 0 || a <= 0 || shockScale <= 0 ||
      D.h[i] < x || D.l[i] > x) {
      return d !== 0
        ? exit('invalid market data')
        : { want: 0, why: 'invalid market data' };
    }

    const fast = I.ema(c, p.fast);
    const slow = I.ema(c, p.slow);
    const bounce = I.ema(c, p.bounce);

    if (![fast[i], slow[i], slow[i - p.slopeBars], bounce[i]]
      .every(valid)) {
      return d !== 0
        ? exit('indicators unavailable')
        : { want: 0, why: 'indicators unavailable' };
    }

    const gap = (fast[i] - slow[i]) / a;
    const slope = (slow[i] - slow[i - p.slopeBars]) / a;
    const active = 100 * a / x >= p.minAtrPct;

    const trend = !active ? 0
      : gap >= p.gapATR && slope >= p.slopeATR ? 1
      : gap <= -p.gapATR && slope <= -p.slopeATR ? -1
      : 0;

    if (d !== 0) {
      if (trend !== d) return exit('trend faded or reversed');

      if ((d === 1 && x >= bounce[i]) ||
          (d === -1 && x <= bounce[i])) {
        return exit('bounce reached EMA');
      }

      return { want: null, why: 'waiting for snapback' };
    }

    if (s.cooldown > 0) {
      return { want: 0, why: 'post-trade cooldown' };
    }

    if (trend === 0) {
      return { want: 0, why: 'flat or unclear trend' };
    }

    // Detect the shock through the previous close, then require
    // the current closed candle to begin reversing it.
    const shock = (c[k] - c[origin]) / shockScale;
    const stretch = (x - bounce[i]) / a;
    const range = D.h[i] - D.l[i];
    const closeLocation = range > 0 ? (x - D.l[i]) / range : 0.5;

    if (trend === 1 &&
        shock <= -p.shockATR &&
        stretch <= -p.stretchATR &&
        x > c[k] &&
        closeLocation >= 0.5) {
      return { want: 1, why: 'sharp dip turning up in uptrend' };
    }

    if (trend === -1 &&
        shock >= p.shockATR &&
        stretch >= p.stretchATR &&
        x < c[k] &&
        closeLocation <= 0.5) {
      return { want: -1, why: 'sharp rally turning down in downtrend' };
    }

    return { want: 0, why: 'waiting for countertrend shock and turn' };
  }
};