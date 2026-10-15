// Bộ lọc One Euro (Casiez và cộng sự, 2012): làm mượt điểm mốc khi đứng yên, bám kịp khi cử động nhanh.
// minCutoff nhỏ hơn = mượt hơn lúc đứng yên; beta lớn hơn = ít trễ hơn khi cử động nhanh.
const alpha = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

export class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.02, dCutoff = 1) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
    this.x = null
    this.dx = 0
    this.t = 0
  }

  filter(value, t) {
    if (this.x === null) {
      this.x = value
      this.t = t
      return value
    }
    const dt = Math.max(1e-3, (t - this.t) / 1000)
    this.t = t
    const dx = (value - this.x) / dt
    this.dx += alpha(this.dCutoff, dt) * (dx - this.dx)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx)
    this.x += alpha(cutoff, dt) * (value - this.x)
    return this.x
  }
}

// Lọc cả bộ điểm mốc: mỗi toạ độ một bộ lọc. keys: tên các toạ độ của mỗi điểm (vd. ['x', 'y', 'z']).
export function makeLandmarkFilter(keys, minCutoff, beta) {
  const filters = new Map()
  return {
    filter(points, t) {
      return points.map((p, i) => {
        const out = { ...p }
        for (const k of keys) {
          const id = `${i}.${k}`
          let f = filters.get(id)
          if (!f) filters.set(id, (f = new OneEuro(minCutoff, beta)))
          out[k] = f.filter(p[k], t)
        }
        return out
      })
    },
    reset() {
      filters.clear()
    },
  }
}
