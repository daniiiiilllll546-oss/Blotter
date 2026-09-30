// Dip scalper strategy: catches sharp dips in uptrends and sharp rallies in downtrends
module.exports = {
  label: 'Dip Scalper',
  desc: 'Scalps sharp dips in uptrends and sharp rallies in downtrends. Uses ADX to filter flat markets, RSI to detect oversold/overbought conditions during dips/rallies.',
  space: {
    trendLen: [40, 100, 10],        // EMA period to define longer trend
    adxThresh: [20, 35, 2],         // Minimum ADX to trade (filters flat)
    rsiLen: [14, 21, 1],            // RSI period
    rsiDip: [20, 35, 2],            // RSI level for oversold dip entry (long)
    rsiRally: [65, 80, 2]           // RSI level for overbought rally entry (short)
  },
  warm: p => p.trendLen + 50,
  decide(D, p, d, st) {
    const i = D.i;
    const trend = I.ema(D.c, p.trendLen);
    const adxVal = I.adx(D.h, D.l, D.c, 14);
    const rsi = I.rsi(D.c, p.rsiLen);

    const c = D.c[i];
    const t = trend[i];
    const a = adxVal[i];
    const r = rsi[i];

    // Market is flat or indicators not ready
    if (!fin(a) || a < p.adxThresh) {
      return { want: 0, why: `flat (ADX ${fin(a) ? a.toFixed(1) : 'N/A'})` };
    }

    if (d === 0) {
      // LONG: Dip in uptrend - price dips below EMA + oversold RSI
      if (fin(t) && c < t && fin(r) && r < p.rsiDip) {
        return { want: 1, why: `dip-long: RSI ${r.toFixed(0)}%` };
      }

      // SHORT: Rally in downtrend - price rallies above EMA + overbought RSI
      if (fin(t) && c > t && fin(r) && r > p.rsiRally) {
        return { want: -1, why: `rally-short: RSI ${r.toFixed(0)}%` };
      }
    }

    return { want: null, why: 'hold' };
  }
};
