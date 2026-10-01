"""Weighted percentiles with successive-difference replicate (SDR) margins of error.

Percentile rule: the smallest wage x at which cumulative weight reaches q * total weight.
Replicate weights can be negative in ACS PUMS, so the cumulative sum is scanned for the first
crossing rather than binary-searched. The web page (web/template.html) implements the same rule.

MOE (90%) = 1.645 * sqrt(4/80 * sum_r (est_r - est)^2), per ACS PUMS accuracy documentation.
"""
import numpy as np
from config import QS, MIN_N, CAUTION_N, CAUTION_REL


def quantiles(x_sorted, W_sorted, qs=QS):
    """x_sorted: (n,), W_sorted: (n, k) weights ordered by x. Returns array (k, len(qs))."""
    c = np.cumsum(W_sorted, axis=0)
    tot = c[-1]
    out = np.empty((W_sorted.shape[1], len(qs)))
    for j, q in enumerate(qs):
        hit = c >= q * tot
        idx = np.where(hit.any(0), hit.argmax(0), len(x_sorted) - 1)
        out[:, j] = x_sorted[idx]
    return out


def estimate(wage, W):
    """wage: (n,), W: (n, 81) with column 0 = PWGTP and 1..80 = replicates."""
    n = len(wage)
    if n < MIN_N:
        return {'n': n, 'suppressed': True}
    o = np.argsort(wage, kind='stable')
    est = quantiles(wage[o], W[o].astype(float))
    full, rep = est[0], est[1:]
    moe = 1.645 * np.sqrt(4 / 80 * ((rep - full) ** 2).sum(0))
    rel = moe[2] / full[2] * 100 if full[2] else 999.0
    return {'n': n, 'pop': int(W[:, 0].sum()), 'q': full, 'moe': moe, 'rel': rel,
            'caution': bool(n < CAUTION_N or rel > CAUTION_REL), 'suppressed': False}
