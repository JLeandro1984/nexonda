
// Abrevia números grandes (1.000 → 1 mil, 2.500.000 → 2,5 mi)
export function formatarNumeroAbreviado(valor) {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(valor);
}
