import { useState } from "react";

const W = 680;
const H = 320;
const M = { l: 54, r: 92, t: 16, b: 34 };

const fmt = (v, casas) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Evita que os rótulos das linhas fiquem um por cima do outro
function afastar(itens, minimo = 13) {
  const ordenados = [...itens].sort((a, b) => a.y - b.y);
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].y - ordenados[i - 1].y < minimo) {
      ordenados[i].y = ordenados[i - 1].y + minimo;
    }
  }
  return ordenados;
}

// Carta de valores individuais: cada medição na ordem, com limites de especificação e de controle.
export default function CartaControle({ valores, lie, lse, carta, unidade }) {
  const [ativo, setAtivo] = useState(null);

  const temLie = !Number.isNaN(lie);
  const temLse = !Number.isNaN(lse);
  const n = valores.length;

  const todos = [...valores, carta.lsc, carta.lic, ...(temLie ? [lie] : []), ...(temLse ? [lse] : [])];
  const minimo = Math.min(...todos);
  const maximo = Math.max(...todos);
  const folga = (maximo - minimo || 1) * 0.06;
  const baixo = minimo - folga;
  const alto = maximo + folga;
  const casas = alto - baixo < 0.5 ? 3 : alto - baixo < 20 ? 2 : 1;

  const x = (i) => M.l + (n === 1 ? 0 : (i * (W - M.l - M.r)) / (n - 1));
  const y = (v) => M.t + ((alto - v) / (alto - baixo)) * (H - M.t - M.b);

  const marcas = Array.from({ length: 5 }, (_, i) => baixo + ((alto - baixo) * i) / 4);

  const linhas = [
    temLse && { id: "lse", rotulo: `LSE ${fmt(lse, casas)}`, valor: lse, classe: "cpk-linha-espec" },
    { id: "lsc", rotulo: `LSC ${fmt(carta.lsc, casas)}`, valor: carta.lsc, classe: "cpk-linha-controle" },
    { id: "media", rotulo: `Média ${fmt(carta.media, casas)}`, valor: carta.media, classe: "cpk-linha-media" },
    { id: "lic", rotulo: `LIC ${fmt(carta.lic, casas)}`, valor: carta.lic, classe: "cpk-linha-controle" },
    temLie && { id: "lie", rotulo: `LIE ${fmt(lie, casas)}`, valor: lie, classe: "cpk-linha-espec" },
  ].filter(Boolean);

  const rotulos = afastar(linhas.map((l) => ({ ...l, y: y(l.valor) })));

  const situacao = (v) => {
    const partes = [];
    if ((temLse && v > lse) || (temLie && v < lie)) partes.push("Fora da especificação");
    if (v > carta.lsc || v < carta.lic) partes.push("Fora dos limites de controle");
    return partes.length ? partes.join("; ") : "Dentro dos limites";
  };

  const foraEspec = (v) => (temLse && v > lse) || (temLie && v < lie);
  const foraControle = (v) => v > carta.lsc || v < carta.lic;

  const caminho = valores.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  // posição do balão de informações
  let balao = null;
  if (ativo !== null) {
    const v = valores[ativo];
    const larg = 190;
    const px = x(ativo);
    const py = y(v);
    const bx = px + 12 + larg > W - 4 ? px - 12 - larg : px + 12;
    const by = Math.min(Math.max(py - 30, 4), H - M.b - 58);
    balao = { v, bx, by, larg };
  }

  return (
    <figure className="cpk-grafico">
      <div className="cpk-grafico-rolagem">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Carta de valores individuais com ${n} medições, limites de especificação e de controle. A tabela abaixo traz os mesmos valores.`}
      >
        {marcas.map((m, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={y(m)} y2={y(m)} className="cpk-grade" />
            <text x={M.l - 8} y={y(m) + 4} textAnchor="end" className="cpk-eixo">
              {fmt(m, casas)}
            </text>
          </g>
        ))}

        <text x={M.l} y={H - 8} className="cpk-eixo">
          Medição nº 1
        </text>
        <text x={W - M.r} y={H - 8} textAnchor="end" className="cpk-eixo">
          nº {n}
        </text>
        <text x={M.l - 8} y={7} textAnchor="end" className="cpk-eixo">
          {unidade}
        </text>

        {linhas.map((l) => (
          <line key={l.id} x1={M.l} x2={W - M.r} y1={y(l.valor)} y2={y(l.valor)} className={l.classe} />
        ))}
        {rotulos.map((l) => (
          <text key={l.id} x={W - M.r + 8} y={l.y + 4} className="cpk-rotulo">
            {l.rotulo}
          </text>
        ))}

        <path d={caminho} className="cpk-serie" />

        {valores.map((v, i) => (
          <g key={i}>
            {foraControle(v) && <circle cx={x(i)} cy={y(v)} r="9" className="cpk-anel" />}
            {foraEspec(v) ? (
              <rect x={x(i) - 4.5} y={y(v) - 4.5} width="9" height="9" className="cpk-ponto-fora" />
            ) : (
              <circle cx={x(i)} cy={y(v)} r="4" className="cpk-ponto" />
            )}
            {/* área de toque maior que o ponto */}
            <circle
              cx={x(i)}
              cy={y(v)}
              r="12"
              fill="transparent"
              tabIndex={0}
              aria-label={`Medição ${i + 1}: ${fmt(v, casas)} ${unidade}. ${situacao(v)}.`}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
            />
          </g>
        ))}

        {balao && (
          <g className="cpk-balao" pointerEvents="none">
            <rect x={balao.bx} y={balao.by} width={balao.larg} height="54" rx="6" />
            <text x={balao.bx + 10} y={balao.by + 20} className="cpk-balao-valor">
              {fmt(balao.v, casas)} {unidade}
            </text>
            <text x={balao.bx + 10} y={balao.by + 36} className="cpk-balao-texto">
              Medição nº {ativo + 1}
            </text>
            <text x={balao.bx + 10} y={balao.by + 49} className="cpk-balao-texto">
              {situacao(balao.v)}
            </text>
          </g>
        )}
      </svg>
      </div>

      <figcaption className="cpk-legenda">
        <span>
          <i className="cpk-chave cpk-chave-ponto" aria-hidden="true" /> Dentro da especificação
        </span>
        <span>
          <i className="cpk-chave cpk-chave-fora" aria-hidden="true" /> Fora da especificação
        </span>
        <span>
          <i className="cpk-chave cpk-chave-anel" aria-hidden="true" /> Fora dos limites de controle
        </span>
      </figcaption>

      <details className="cpk-tabela">
        <summary>Ver tabela das medições</summary>
        <div className="cpk-tabela-rolagem">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Valor ({unidade})</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {valores.map((v, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{fmt(v, casas)}</td>
                  <td>{situacao(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}