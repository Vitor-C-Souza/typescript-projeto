import { Armazenador } from "./Armazenador.js";
import { ValidaDebito, ValidaDeposito } from "./Decorators.js";
import { GrupoTransacao } from "./GrupoTransacao.js";
import { TipoTransacao } from "./TipoTransacao.js";
import { Transacao } from "./Transacao.js";

export class Conta {
  private nome: string;
  private saldo: number = Armazenador.obter<number>("saldo") || 0;
  private transacoes: Transacao[] =
    Armazenador.obter<Transacao[]>("transacoes", (key: string, value: any) => {
      if (key === "data") {
        return new Date(value);
      }
      return value;
    }) || [];

  private resumo: ResumoTransacoes = Armazenador.obter("resumo") || {
    totalDepositos: 0,
    totalTransferencias: 0,
    totalPagamentosBoleto: 0,
  };

  constructor(nome: string) {
    this.nome = nome;
  }

  public getNome(): string {
    return this.nome;
  }

  public getGruposTransacoes(): GrupoTransacao[] {
    const gruposTransacoes: GrupoTransacao[] = [];
    const listaTransacoes: Transacao[] = structuredClone(this.transacoes);
    const transacoesOrdenadas: Transacao[] = listaTransacoes.sort(
      (t1, t2) => t2.data.getTime() - t1.data.getTime()
    );
    let labelAtualGrupoTransacao: string = "";

    for (let transacao of transacoesOrdenadas) {
      let labelGrupoTransacao: string = transacao.data.toLocaleDateString(
        "pt-br",
        { month: "long", year: "numeric" }
      );
      if (labelAtualGrupoTransacao !== labelGrupoTransacao) {
        labelAtualGrupoTransacao = labelGrupoTransacao;
        gruposTransacoes.push({
          label: labelGrupoTransacao,
          transacoes: [],
        });
      }
      gruposTransacoes.at(-1).transacoes.push(transacao);
    }

    return gruposTransacoes;
  }

  public getSaldo(): number {
    return this.saldo;
  }

  public getDataAcesso(): Date {
    return new Date();
  }

  public registrarTransacao(novaTransacao: Transacao): void {
    if (novaTransacao.tipoTransacao === TipoTransacao.DEPOSITO) {
      this.depositar(novaTransacao.valor);
    } else if (
      novaTransacao.tipoTransacao === TipoTransacao.TRANSFERENCIA ||
      novaTransacao.tipoTransacao === TipoTransacao.PAGAMENTO_BOLETO
    ) {
      this.debitar(novaTransacao.valor);
      novaTransacao.valor *= -1;
    } else {
      throw new Error("Tipo de Transação é inválido!");
    }
    this.transacoes.push(novaTransacao);
    console.log(this.getGruposTransacoes());
    localStorage.setItem("transacoes", JSON.stringify(this.transacoes));
  }

  @ValidaDeposito
  private depositar(valor: number): void {
    if (valor <= 0) {
      throw new Error("O valor a ser depositado deve ser maior que zero!");
    }
    this.saldo += valor;

    Armazenador.salvar("saldo", this.saldo.toString());
  }

  @ValidaDebito
  private debitar(valor: number): void {
    this.saldo -= valor;

    Armazenador.salvar("saldo", this.saldo.toString());
  }

  public resumoTransacoes(tipoTransacao: TipoTransacao) {
    if (tipoTransacao === TipoTransacao.DEPOSITO) {
      this.resumo.totalDepositos++;
    } else if (tipoTransacao === TipoTransacao.TRANSFERENCIA) {
      this.resumo.totalTransferencias++;
    } else if (tipoTransacao === TipoTransacao.PAGAMENTO_BOLETO) {
      this.resumo.totalPagamentosBoleto++;
    } else {
      throw new Error("Tipo de transação invalida!");
    }

    Armazenador.salvar("resumo", this.resumo);
    console.log(this.resumo);
  }
}

export class ContaPremium extends Conta {
  registrarTransacao(transacao: Transacao): void {
    if (transacao.tipoTransacao === TipoTransacao.DEPOSITO) {
      console.log("ganhou um bônus de 0.50 centavos");
      transacao.valor += 0.5;
    }
    this.registrarTransacao(transacao);
  }
}

const contaPremium = new ContaPremium("Mônica Hillman");
const conta = new Conta("Joana da Silva Olveira");

export default conta;
