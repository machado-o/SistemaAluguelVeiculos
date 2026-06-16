import { Op } from "sequelize";
import sequelize from "../config/database-connection.js";
import { Checkout } from "../models/Checkout.js";
import { Checkin } from "../models/Checkin.js";
import { Reserva } from "../models/Reserva.js";
import { Avaria } from "../models/Avaria.js";
import { Veiculo } from "../models/Veiculo.js";
import { Funcionario } from "../models/Funcionario.js";
import { Multa } from "../models/Multa.js";
import { Seguro } from "../models/Seguro.js";
import { validarModel } from "./_validarModel.js";

const TAXA_INSPECAO = 150.00;

// Regra 1: quilometragem de devolução deve ser maior que a do check-in e não inferior à maior já registrada para o veículo
async function validarQuilometragem(quilometragemCheckout, checkin, erros) {
  if (parseFloat(quilometragemCheckout) <= parseFloat(checkin.quilometragemCheckin)) {
    erros.push("A quilometragem de devolução deve ser maior que a quilometragem registrada no check-in!");
    return;
  }

  // MAX via JOIN Checkout → Checkin: garante que o odômetro nunca regride em toda a história do veículo
  const resultado = await Checkout.findOne({
    attributes: [[sequelize.fn('MAX', sequelize.col('quilometragem_checkout')), 'maxQuilometragem']],
    include: [{
      model: Checkin,
      as: 'checkin',
      required: true,
      where: { veiculoId: checkin.veiculoId },
      attributes: [],
    }],
    raw: true,
    subQuery: false,
  });

  const maxQuilometragem = resultado?.maxQuilometragem;
  if (maxQuilometragem != null && parseFloat(quilometragemCheckout) < parseFloat(maxQuilometragem))
    erros.push("A quilometragem de devolução não pode ser inferior à maior quilometragem já registrada para este veículo!");
}

// Regra 2: clientes com mais de 3 avarias em aluguéis anteriores pagam taxa de inspeção de R$ 150,00
async function calcularTaxaInspecao(clienteId) {
  const checkinsDoCliente = await Checkin.findAll({
    include: [{ model: Reserva, as: "reserva", required: true, where: { clienteId }, attributes: [] }],
    attributes: ["id"],
  });

  const idsCheckins = checkinsDoCliente.map(c => c.id);
  if (idsCheckins.length === 0) return 0;

  const checkoutsAnteriores = await Checkout.findAll({
    where: { checkinId: { [Op.in]: idsCheckins } },
    include: [{ model: Avaria, as: "avarias" }],
  });

  const totalAvarias = checkoutsAnteriores.reduce((total, co) => total + co.avarias.length, 0);
  return totalAvarias > 3 ? TAXA_INSPECAO : 0;
}

// Regra: data de devolução não pode ser anterior à data do check-in
function validarDataCheckout(dataCheckout, checkin, erros) {
  if (new Date(dataCheckout) < new Date(checkin.dataCheckin))
    erros.push("A data de devolução não pode ser anterior à data do check-in!");
}

// Orquestra todas as validações de negócio para create e update
async function verificarRegrasDeNegocio({ dataCheckout, quilometragemCheckout, checkinId, obj, erros }) {
  const checkin = checkinId ? await Checkin.findByPk(checkinId) : obj;

  if (!checkin) {
    erros.push("Check-in não encontrado!");
    return;
  }

  if (quilometragemCheckout !== undefined) await validarQuilometragem(quilometragemCheckout, checkin, erros);
  if (dataCheckout !== undefined) validarDataCheckout(dataCheckout, checkin, erros);
}

class CheckoutService {

  // Include explícito: traz as associações diretas + checkin.veiculo (placa exibida na lista).
  // Evita { all: true, nested: true }, que expande toda a árvore de relações e gera uma query gigante.
  static get includeCompleto() {
    return [
      { association: 'checkin', include: ['veiculo'] },
      'funcionario',
      'avarias',
    ];
  }

  static async findAll() {
    return await Checkout.findAll({ include: CheckoutService.includeCompleto });
  }

  static async findByPk(req) {
    const { id } = req.params;
    return await Checkout.findByPk(id, { include: CheckoutService.includeCompleto });
  }

  static async create(req) {
    const { dataCheckout, quilometragemCheckout, nivelCombustivel, condicaoPneus, condicaoPalhetas,
            limpoInternamente, limpoExternamente, observacoes, checkinId, funcionarioId, avariaIds } = req.body;
    const erros = [];

    const [checkin, funcionario] = await Promise.all([
      Checkin.findByPk(checkinId),
      Funcionario.findByPk(funcionarioId),
    ]);

    if (!checkin) erros.push("Check-in não encontrado!");
    if (!funcionario) erros.push("Funcionário não encontrado!");

    if (checkin) await verificarRegrasDeNegocio({ dataCheckout, quilometragemCheckout, checkinId: null, obj: checkin, erros });

    erros.push(...await validarModel(Checkout.build({ dataCheckout, quilometragemCheckout, nivelCombustivel, condicaoPneus, condicaoPalhetas, limpoInternamente, limpoExternamente, observacoes, checkinId, funcionarioId, taxaInspecao: 0 })));

    if (erros.length > 0) throw erros.join(" ");

    const reserva = await Reserva.findByPk(checkin.reservaId, { include: [{ model: Seguro, as: 'seguro' }] });
    const taxaInspecao = await calcularTaxaInspecao(reserva.clienteId);

    return await sequelize.transaction(async (t) => {
      const obj = await Checkout.create({ dataCheckout, quilometragemCheckout, nivelCombustivel, condicaoPneus, condicaoPalhetas, limpoInternamente, limpoExternamente, observacoes, checkinId, funcionarioId, taxaInspecao }, { transaction: t });

      if (avariaIds) await obj.setAvarias(avariaIds, { transaction: t });

      if (avariaIds && avariaIds.length > 0) {
        const avarias = await Avaria.findAll({ where: { id: avariaIds }, transaction: t });
        const totalAvarias = avarias.reduce((sum, a) => sum + parseFloat(a.valor), 0);
        if (totalAvarias > 0) {
          const valorMulta = reserva.seguro
            ? Math.min(totalAvarias, parseFloat(reserva.seguro.franquia))
            : totalAvarias;
          await Multa.create({
            valor: valorMulta,
            dataEmissao: new Date(),
            descricao: "Avarias registradas no checkout não cobertas pelo seguro",
            status: 'Pendente',
            clienteId: reserva.clienteId,
            reservaId: reserva.id,
          }, { transaction: t });
        }
      }

      const veiculo = await Veiculo.findByPk(checkin.veiculoId, { transaction: t });
      veiculo.quilometragem = quilometragemCheckout;
      veiculo.status = 'Disponível';
      await veiculo.save({ transaction: t });

      reserva.status = 'Concluída';
      await reserva.save({ transaction: t });

      return await Checkout.findByPk(obj.id, { include: { all: true }, transaction: t });
    });
  }

  static async update(req) {
    const { id } = req.params;
    // Edição restrita a campos de inspeção/observação. Quilometragem e avarias são IMUTÁVEIS:
    // alterá-las exigiria refazer o odômetro do veículo, a taxa de inspeção e a multa gerada
    // (que é vinculada à reserva, não ao checkout). Para corrigir esses dados, remova e recrie.
    const { nivelCombustivel, condicaoPneus, condicaoPalhetas, limpoInternamente, limpoExternamente, observacoes, funcionarioId } = req.body;

    const obj = await Checkout.findByPk(id, { include: { all: true } });
    if (obj == null) throw 'Checkout não encontrado!';

    const patch = { nivelCombustivel, condicaoPneus, condicaoPalhetas, limpoInternamente, limpoExternamente, observacoes, funcionarioId };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    Object.assign(obj, patch);

    const erros = await validarModel(obj);
    if (erros.length > 0) throw erros.join(" ");

    await obj.save({ validate: false });
    return await Checkout.findByPk(obj.id, { include: { all: true } });
  }

  static async delete(req) {
    const { id } = req.params;
    const obj = await Checkout.findByPk(id);
    if (obj == null) throw 'Checkout não encontrado!';
    try {
      await obj.destroy();
      return obj;
    } catch (error) {
      throw "Não é possível remover este checkout pois ele está vinculado a um checkin!";
    }
  }
}
export { CheckoutService };
