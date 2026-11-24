import { useState, useMemo } from "react";
import "./CpCpk.css";
import CartaControle from "../CartaControle";
import { EXEMPLO } from "../Exemplo/exemplo";
import { lerMedicoes, lerValor, calcularCapabilidade, classificar } from "../Estatisticas/estatisticas";

const fmt = (v, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const ICONES = { capaz: "✔", marginal: "▲", incapaz: "✖" };

function Situacao({ cpk }) {
  const { nivel, texto } = classificar(cpk);
  return (
    <span className={`cpk-situacao cpk-${nivel}`}>
      <span aria-hidden="true">{ICONES[nivel]}</span> {texto}
    </span>
  );
}

const lerLimite = (texto) => (texto.trim() === "" ? NaN : lerValor(texto));

export default function CpCpk() {
  const [unidade, setUnidade] = useState("mm");
  const [lie, setLie] = useState("");
  const [lse, setLse] = useState("");
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  const { valores, invalidos } = useMemo(() => lerMedicoes(texto), [texto]);
  const lieNum = lerLimite(lie);
  const lseNum = lerLimite(lse);

  const limiteInvalido =
    (lie.trim() !== "" && Number.isNaN(lieNum)) || (lse.trim() !== "" && Number.isNaN(lseNum));

  const { resultado, erro } = useMemo(() => {
    if (texto.trim() === "") return { resultado: null };
    return calcularCapabilidade({ valores, lie: lieNum, lse: lseNum });
  }, [texto, valores, lieNum, lseNum]);

  function usarExemplo() {
    setUnidade(EXEMPLO.unidade);
    setLie(EXEMPLO.lie);
    setLse(EXEMPLO.lse);
    setTexto(EXEMPLO.medicoes);
  }

  function limpar() {
    setLie("");
    setLse("");
    setTexto("");
  }

  async function copiar() {
    if (!resultado) return;
    const r = resultado;
    const linhas = [
      `Capabilidade do processo (${r.n} medições, ${unidade})`,
      `Limites de especificação: LIE ${Number.isNaN(lieNum) ? "—" : fmt(lieNum)} | LSE ${Number.isNaN(lseNum) ? "—" : fmt(lseNum)}`,
      `Média: ${fmt(r.media, 3)} | Desvio-padrão (s): ${fmt(r.s, 3)} | Mín: ${fmt(r.min)} | Máx: ${fmt(r.max)}`,
      `Fora da especificação: ${r.foraAbaixo + r.foraAcima} de ${r.n}`,
    ];
    if (r.curto) {
      linhas.push(`Curto prazo: Cp ${r.curto.cp === null ? "—" : fmt(r.curto.cp)} | Cpk ${fmt(r.curto.cpk)}`);
    }
    if (r.geral) {
      linhas.push(`Geral: Pp ${r.geral.cp === null ? "—" : fmt(r.geral.cp)} | Ppk ${fmt(r.geral.cpk)}`);
    }
    try {
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão de copiar: o resultado continua na tela */
    }
  }

  const linhaIndice = (rotulo, detalhe, nomes, ind) => (
    <tr>
      <th scope="row">
        {rotulo}
        <small>{detalhe}</small>
      </th>
      {ind ? (
        <>
          <td>
            <span className="cpk-nome">{nomes[0]}</span>
            {ind.cp === null ? "—" : fmt(ind.cp)}
          </td>
          <td>
            <span className="cpk-nome">{nomes[1]}</span>
            <strong>{fmt(ind.cpk)}</strong>
          </td>
          <td>
            <Situacao cpk={ind.cpk} />
          </td>
        </>
      ) : (
        <td colSpan="3">Não foi possível calcular (as medições não variam).</td>
      )}
    </tr>
  );

  return (
    <section className="cpk" aria-label="Calculadora de Cp e Cpk">
      <h2>Capabilidade do processo: Cp e Cpk</h2>

      <div className="cpk-grade">
        <form className="cpk-form" onSubmit={(e) => e.preventDefault()}>
          <div className="cpk-linha3">
            <label>
              LIE
              <input inputMode="decimal" value={lie} onChange={(e) => setLie(e.target.value)} />
            </label>
            <label>
              LSE
              <input inputMode="decimal" value={lse} onChange={(e) => setLse(e.target.value)} />
            </label>
            <label>
              Unidade
              <input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            </label>
          </div>
          <p className="cpk-dica">
            LIE e LSE são os limites inferior e superior de especificação. Se houver só um deles,
            deixe o outro em branco.
          </p>

          <label>
            Medições, na ordem em que foram feitas
            <textarea
              rows={10}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={"Uma por linha:\n9,17\n9,21\n9,15"}
            />
          </label>
          <p className="cpk-dica">
            Pode colar da planilha. Aceita vírgula ou ponto decimal e separa por linha, espaço ou
            ponto e vírgula.
          </p>

          <div className="cpk-botoes">
            <button type="button" onClick={usarExemplo}>
              Usar dados de exemplo
            </button>
            <button type="button" onClick={limpar}>
              Limpar
            </button>
          </div>
        </form>

        <div className="cpk-saida" aria-live="polite">
          {limiteInvalido && <p className="cpk-erro">Confira os limites: use apenas números.</p>}
          {!limiteInvalido && erro && texto.trim() !== "" && <p className="cpk-erro">{erro}</p>}
          {invalidos.length > 0 && (
            <p className="cpk-aviso-valores">
              {invalidos.length} valor{invalidos.length > 1 ? "es" : ""} ignorado
              {invalidos.length > 1 ? "s" : ""} (não {invalidos.length > 1 ? "são números" : "é número"}):{" "}
              {invalidos.slice(0, 5).join(", ")}
              {invalidos.length > 5 ? "…" : ""}
            </p>
          )}

          {!resultado && !erro && (
            <p className="cpk-vazio">
              Informe os limites de especificação e cole as medições para calcular. Se quiser ver
              funcionando, use os dados de exemplo.
            </p>
          )}

          {resultado && !limiteInvalido && (
            <>
              <dl className="cpk-resumo">
                {[
                  ["Medições", String(resultado.n)],
                  ["Média", fmt(resultado.media, 3)],
                  ["Desvio-padrão (s)", fmt(resultado.s, 3)],
                  ["Mínimo / Máximo", `${fmt(resultado.min)} / ${fmt(resultado.max)}`],
                  ["Fora da especificação", `${resultado.foraAbaixo + resultado.foraAcima} de ${resultado.n}`],
                ].map(([nome, valor]) => (
                  <div key={nome}>
                    <dt>{nome}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>

              <table className="cpk-indices">
                <tbody>
                  {linhaIndice(
                    "Curto prazo",
                    "σ pela amplitude móvel",
                    ["Cp", "Cpk"],
                    resultado.curto
                  )}
                  {linhaIndice("Geral", "σ = desvio-padrão (s)", ["Pp", "Ppk"], resultado.geral)}
                </tbody>
              </table>

              {resultado.ppmEstimado !== null && (
                <p className="cpk-ppm">
                  Estimativa de peças fora da especificação (distribuição normal):{" "}
                  <strong>
                    {resultado.ppmEstimado < 1 ? "menos de 1" : fmt(resultado.ppmEstimado, 0)} ppm
                  </strong>
                </p>
              )}

              <button type="button" className="cpk-copiar" onClick={copiar}>
                {copiado ? "Copiado!" : "Copiar resumo"}
              </button>
            </>
          )}
        </div>
      </div>

      {resultado && !limiteInvalido && (
        <CartaControle
          valores={valores}
          lie={lieNum}
          lse={lseNum}
          carta={resultado.carta}
          unidade={unidade}
        />
      )}

      <p className="cpk-nota">
        <strong>Como ler:</strong> o Cp compara a largura da especificação com a variação do
        processo; o Cpk também considera se a média está centrada. O Cp e o Cpk (curto prazo)
        pressupõem medições na ordem em que foram feitas. O Pp e o Ppk usam todo o desvio-padrão. A
        referência de 1,33 é comum, mas o critério de aceitação vem do cliente ou da norma
        aplicável. Os cálculos supõem dados com distribuição aproximadamente normal e processo
        estável.
      </p>
    </section>
  );
}