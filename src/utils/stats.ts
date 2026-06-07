export function linearRegressionSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0)
  const sumX2 = values.reduce((acc, _, i) => acc + i * i, 0)
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}
