// Cálculos de capabilidade do processo (Cp, Cpk, Pp, Ppk) e da carta de valores individuais.

// Lê um número escrito no padrão brasileiro: "9,17", "9.17" ou "1.234,5".
export function lerValor(token) {
  let t = token.trim();
  if (t === "") return NaN;
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, "");
  t = t.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// Aceita valores separados por linha, espaço, tab ou ponto e vírgula.
export function lerMedicoes(texto) {
  const valores = [];
  const invalidos = [];
  for (const token of texto.split(/[\n\r\t; ]+/)) {
    if (token === "") continue;
    const v = lerValor(token);
    if (Number.isNaN(v)) invalidos.push(token);
    else valores.push(v);
  }
  return { valores, invalidos };
}

export const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;

// desvio-padrão amostral (divisor n − 1)
export function desvioAmostral(v) {
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

// média das diferenças entre medições consecutivas (em módulo)
export function amplitudeMovelMedia(v) {
  let soma = 0;
  for (let i = 1; i < v.length; i++) soma += Math.abs(v[i] - v[i - 1]);
  return soma / (v.length - 1);
}

// Função de distribuição normal padrão Φ(z), pela série de Taylor da integral
export function phi(z) {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const densidade = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  let termo = z;
  let soma = z;
  for (let k = 1; k < 200; k++) {
    termo *= (z * z) / (2 * k + 1);
    soma += termo;
    if (Math.abs(termo) < 1e-18 * Math.abs(soma)) break;
  }
  return 0.5 + densidade * soma;
}

// lie / lse: limites de especificação (NaN quando não existe)
export function indices(mediaValor, sigma, lie, lse) {
  const temLie = !Number.isNaN(lie);
  const temLse = !Number.isNaN(lse);
  const cpl = temLie ? (mediaValor - lie) / (3 * sigma) : null;
  const cpu = temLse ? (lse - mediaValor) / (3 * sigma) : null;
  return {
    cp: temLie && temLse ? (lse - lie) / (6 * sigma) : null,
    cpk: Math.min(...[cpl, cpu].filter((x) => x !== null)),
    cpl,
    cpu,
  };
}

// Referência comum na indústria; o critério real vem do cliente ou da norma.
export function classificar(cpk) {
  if (cpk >= 1.33) return { nivel: "capaz", texto: "Capaz (≥ 1,33)" };
  if (cpk >= 1) return { nivel: "marginal", texto: "Marginal (1,00 a 1,33)" };
  return { nivel: "incapaz", texto: "Não capaz (< 1,00)" };
}

// Devolve { erro } ou { resultado }
export function calcularCapabilidade({ valores, lie, lse }) {
  const temLie = !Number.isNaN(lie);
  const temLse = !Number.isNaN(lse);
  if (!temLie && !temLse) return { erro: "Informe pelo menos um limite de especificação (LIE ou LSE)." };
  if (temLie && temLse && lie >= lse) {
    return { erro: "O limite inferior (LIE) precisa ser menor que o superior (LSE)." };
  }
  if (valores.length < 2) return { erro: "Informe pelo menos 2 medições." };

  const n = valores.length;
  const m = media(valores);
  const s = desvioAmostral(valores);
  const mrBar = amplitudeMovelMedia(valores);
  const sigmaCurto = mrBar / 1.128;

  const resultado = {
    n,
    media: m,
    s,
    min: Math.min(...valores),
    max: Math.max(...valores),
    mrBar,
    sigmaCurto,
    foraAbaixo: temLie ? valores.filter((x) => x < lie).length : 0,
    foraAcima: temLse ? valores.filter((x) => x > lse).length : 0,
    // limites de controle da carta de valores individuais (2,66 = 3 / 1,128)
    carta: { media: m, lsc: m + 2.66 * mrBar, lic: m - 2.66 * mrBar },
    geral: null,
    curto: null,
    ppmEstimado: null,
  };

  if (s > 0) {
    resultado.geral = indices(m, s, lie, lse);
    const abaixo = temLie ? phi((lie - m) / s) : 0;
    const acima = temLse ? 1 - phi((lse - m) / s) : 0;
    resultado.ppmEstimado = (abaixo + acima) * 1e6;
  }
  if (sigmaCurto > 0) resultado.curto = indices(m, sigmaCurto, lie, lse);

  return { resultado };
}