module.exports = {
  label: 'SOL trend pullback',
  desc: 'Buys sharp dips in an upward trend and shorts sharp rallies in a downward trend after recovery begins. Filters quiet markets and extreme candles, exits on a bounce or trend failure, and limits holding time.',
  space: {
    fastN: [24, 48, 2],
    slowN: [80, 160, 8],
    meanN: [8, 20, 1],
    impulseBars: [1, 4, 1],
    impulseATR: [0.8, 1.8, 0.1],
    stretchATR: [0.4, 1.2, 0.1],
    separationATR: [0.15, 0.6, 0.05],
    slopeATR: [0.05, 0.25, 0.025],
    minAtrPct: [0.1, 0.35, 0.025],
    recoveryATR: [0.1, 0.4, 0.05],
    recoveryBars: [1, 3, 1],
    minBouncePct: [0.35, 0.7, 0.05],
    maxRangeATR: [2.5, 5, 0.25],
    holdBars: [4, 12, 1],
    cooldownBars: [1, 4, 1]
  },

  warm(p) {
    return Math.min(590, Math.max(
      30,
      Math.ceil(3 * p.slowN + p.impulseBars + 10)
    ));
  },

  decide(D, p, d, st) {
    // Count calls, not array indices: D.i can stay at 599 as data rolls.
    const bar = st.bar = (st.bar || 0) + 1;
    const previousPosition = st.position || 0;
    const timestamp = D.t !== null && typeof D.t === 'object'
      ? D.t[D.i]
      : D.t;
    const hasTime = typeof timestamp === 'number' && fin(timestamp);
    const holdLimit = Math.min(12, Math.max(1, p.holdBars));

    const reply = (want, why) => ({ want, why });
    const exit = why => {
      st.arm = null;
      st.nextEntry = bar + p.cooldownBars;
      return reply(0, why);
    };

    if (previousPosition !== 0 && d === 0) {
      st.nextEntry = bar + p.cooldownBars;
      st.arm = null;
    }

    if (d !== 0 && (
      d !== previousPosition || !st.trade
    )) {
      const request = st.request && st.request.side === d
        ? st.request
        : null;

      st.trade = {
        side: d,
        entryBar: request ? request.bar : bar - 1,
        entryTime: request ? request.time : null,
        target: request ? request.target : null
      };
      st.arm = null;
    }

    st.position = d;
    st.request = null;

    if (d === 0) st.trade = null;

    // Check timeout before indicators, including when market data is bad.
    if (d !== 0) {
      const age = bar - st.trade.entryBar;
      const elapsed = hasTime &&
        typeof st.trade.entryTime === 'number' &&
        fin(st.trade.entryTime)
          ? timestamp - st.trade.entryTime
          : 0;

      // Candle timestamps may use Unix seconds or milliseconds.
      const candleSeconds = hasTime && timestamp < 1e11;
      const timeLimit = holdLimit * 15 * (candleSeconds ? 60 : 60000);

      if (age >= holdLimit || elapsed >= timeLimit) {
        return exit('maximum holding time');
      }
    }

    const i = D.i;
    const x = D.c[i];
    const a = D.atr[i];
    const valid = value => typeof value === 'number' && fin(value);
    const warmLength = Math.min(590, Math.max(
      30,
      Math.ceil(3 * p.slowN + p.impulseBars + 10)
    ));

    if (
      i < warmLength - 1 ||
      !valid(x) || x <= 0 ||
      !valid(a) || a <= 0 ||
      !valid(D.h[i]) || !valid(D.l[i]) ||
      D.h[i] < x || D.l[i] > x
    ) {
      st.arm = null;
      return d !== 0
        ? exit('unusable market data')
        : reply(null, 'warming up or unusable data');
    }

    const fast = I.ema(D.c, p.fastN);
    const slow = I.ema(D.c, p.slowN);
    const mean = I.ema(D.c, p.meanN);
    const f = fast[i];
    const s = slow[i];
    const m = mean[i];
    const priorSlow = slow[i - 4];

    if (![f, s, m, priorSlow].every(valid)) {
      st.arm = null;
      return d !== 0
        ? exit('unusable indicators')
        : reply(null, 'waiting for indicators');
    }

    const separation = (f - s) / a;
    const slope = (s - priorSlow) / a;
    const atrPct = 100 * a / x;
    const extreme = (D.h[i] - D.l[i]) / a > p.maxRangeATR;

    if (extreme) {
      st.arm = null;
      return d !== 0
        ? exit('extreme volatility')
        : reply(null, 'extreme candle');
    }

    if (d !== 0) {
      if (d * (f - s) <= 0 || d * slope <= 0) {
        return exit('larger trend failed');
      }

      const target = valid(st.trade.target)
        ? st.trade.target
        : m;

      if (d * (x - target) >= 0 || d * (x - m) >= 0) {
        return exit('bounce reached mean');
      }

      return reply(null, 'holding for bounce');
    }

    const trend = atrPct >= p.minAtrPct
      ? separation >= p.separationATR && slope >= p.slopeATR
        ? 1
        : separation <= -p.separationATR && slope <= -p.slopeATR
          ? -1
          : 0
      : 0;

    if (trend === 0) {
      st.arm = null;
      return reply(null, 'quiet or unclear trend');
    }

    if (bar < (st.nextEntry || 0)) {
      st.arm = null;
      return reply(null, 'cooldown');
    }

    if (st.arm && (
      st.arm.side !== trend ||
      bar - st.arm.bar > p.recoveryBars
    )) {
      st.arm = null;
    }

    if (st.arm) {
      const arm = st.arm;
      arm.extreme = trend === 1
        ? Math.min(arm.extreme, x)
        : Math.max(arm.extreme, x);

      const recovering = trend * (x - D.c[i - 1]) > 0 &&
        trend * (x - arm.extreme) >= p.recoveryATR * a;

      const roomPct = 100 * trend * (m - x) / x;

      if (
        bar > arm.bar &&
        recovering &&
        roomPct >= p.minBouncePct
      ) {
        st.request = {
          side: trend,
          bar,
          time: hasTime ? timestamp : null,
          target: m
        };
        st.arm = null;
        st.nextEntry = bar + p.cooldownBars;

        return reply(
          trend,
          trend === 1 ? 'dip recovery in uptrend' : 'rally fading in downtrend'
        );
      }

      if (trend * (m - x) <= 0) st.arm = null;
    }

    const reference = D.c[i - p.impulseBars];
    if (!valid(reference)) {
      st.arm = null;
      return reply(null, 'missing impulse history');
    }

    const adverseMove = -trend * (x - reference) / a;
    const stretch = trend * (m - x) / a;

    if (
      !st.arm &&
      adverseMove >= p.impulseATR &&
      stretch >= p.stretchATR
    ) {
      st.arm = { side: trend, bar, extreme: x };
      return reply(null, 'sharp pullback; awaiting recovery');
    }

    return reply(null, st.arm ? 'awaiting recovery' : 'waiting for pullback');
  }
};