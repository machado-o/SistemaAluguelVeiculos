import { Op } from "sequelize";
import sequelize from "../config/database-connection.js";
import { Checkin } from "../models/Checkin.js";
import { Reserva } from "../models/Reserva.js";
import { Veiculo } from "../models/Veiculo.js";
import { CategoriaVeiculo } from "../models/CategoriaVeiculo.js";
import { Multa } from "../models/Multa.js";
import { Funcionario } from "../models/Funcionario.js";
import { validarModel } from "./_validarModel.js";

// Regra 1.1: resolve qual veículo será utilizado — usa o solicitado ou realiza upgrade automático se a categoria estiver sem disponibilidade
async function resolverVeiculoParaCheckin(reserva, veiculoId) {
  const veiculosNaCategoria = await Veiculo.findAll({
    where: { categoriaVeiculoId: reserva.categoriaVeiculoId, status: "Disponível" },
  });
  
  if (veiculosNaCategoria.length === 0) {
    const veiculoFinalId = await buscarVeiculoUpgrade(reserva.categoriaVeiculoId);
    const erros = veiculoFinalId ? [] : ["Não há veículos disponíveis para esta reserva e não foi possível realizar upgrade de categoria!"];
    return { veiculoFinalId, erros };
  }
  return validarVeiculoSolicitado(reserva, veiculoId);
}

// Regra 1.2: veículo selecionado deve estar disponível e pertencer à categoria da reserva
async function validarVeiculoSolicitado(reserva, veiculoId) {
  const erros = [];

  if (!veiculoId) {
    erros.push("Informe o veículo para realizar o check-in!");
    return { veiculoFinalId: null, erros };
  }

  const veiculo = await Veiculo.findByPk(veiculoId);
  if (!veiculo) {
    erros.push("Veículo não encontrado!");
    return { veiculoFinalId: null, erros };
  }
  if (veiculo.status !== "Disponível") erros.push("O veículo selecionado não está disponível!");
  if (veiculo.categoriaVeiculoId !== reserva.categoriaVeiculoId) erros.push("O veículo selecionado não pertence à categoria da reserva!");

  return { veiculoFinalId: veiculoId, erros };
}

// Regra 1.3: se não há veículo disponível na categoria, realiza upgrade gratuito para a próxima categoria com veículo disponível
async function buscarVeiculoUpgrade(categoriaVeiculoId) {
  const categoriasSuperiores = await CategoriaVeiculo.findAll({
    where: { id: { [Op.gt]: categoriaVeiculoId } },
    order: [["id", "ASC"]],
  });

  for (const cat of categoriasSuperiores) {
    const veiculo = await Veiculo.findOne({ where: { categoriaVeiculoId: cat.id, status: "Disponível" } });
    if (veiculo) return veiculo.id;
  }

  return null;
}

// Regra 2: cliente com multas pendentes não pode realizar check-in
async function validarDebitosPendentesCliente(clienteId, erros) {
  const debitosPendentes = await Multa.count({ where: { clienteId, status: "Pendente" } });
  if (debitosPendentes > 0) erros.push("O cliente possui débitos pendentes e não pode realizar o check-in!");
}

// Regra: reserva deve estar com status Pendente para permitir check-in
function validarStatusReserva(reserva, erros) {
  if (reserva.status !== 'Pendente') erros.push("Só é possível realizar check-in em reservas com status Pendente!");
}

// Regra: CNH informada deve corresponder exatamente à CNH cadastrada no cliente da reserva
function validarCnhCondutor(cnhCondutor, reserva, erros) {
  if (cnhCondutor !== reserva.cliente.cnh) erros.push("A CNH informada não corresponde à CNH cadastrada para o cliente da reserva!");
}

// Regra km: quilometragem do check-in não pode ser inferior à quilometragem atual do veículo
async function validarQuilometragemCheckin(quilometragemCheckin, veiculoId, erros) {
  if (quilometragemCheckin === undefined || !veiculoId) return;
  const veiculo = await Veiculo.findByPk(veiculoId, { attributes: ['quilometragem'] });
  if (veiculo && parseFloat(quilometragemCheckin) < parseFloat(veiculo.quilometragem)) {
    erros.push(`A quilometragem informada (${parseFloat(quilometragemCheckin).toLocaleString('pt-BR')} km) não pode ser inferior à quilometragem atual do veículo (${parseFloat(veiculo.quilometragem).toLocaleString('pt-BR')} km)!`);
  }
}

// Orquestra todas as validações de negócio para create e update
async function verificarRegrasDeNegocio({ cnhCondutor, quilometragemCheckin, reserva, veiculoId, isUpdate, erros }) {
  if (!isUpdate) {
    validarStatusReserva(reserva, erros);
    await validarDebitosPendentesCliente(reserva.clienteId, erros);
  }

  if (cnhCondutor !== undefined) validarCnhCondutor(cnhCondutor, reserva, erros);

  if (!isUpdate) {
    const { veiculoFinalId, erros: errosVeiculo } = await resolverVeiculoParaCheckin(reserva, veiculoId);
    erros.push(...errosVeiculo);
    await validarQuilometragemCheckin(quilometragemCheckin, veiculoFinalId, erros);
    return veiculoFinalId;
  }
  return veiculoId ?? null;
}

class CheckinService {

  // Include explícito: traz as associações diretas + reserva.cliente (nome exibido na lista).
  // Evita { all: true, nested: true }, que expande toda a árvore de relações e gera uma query gigante.
  static get includeCompleto() {
    return [
      { association: 'reserva', include: ['cliente'] },
      'veiculo',
      'funcionario',
      'checkout',
    ];
  }

  static async findAll() {
    return await Checkin.findAll({ include: CheckinService.includeCompleto });
  }

  static async findByPk(req) {
    const { id } = req.params;
    return await Checkin.findByPk(id, { include: CheckinService.includeCompleto });
  }

  static async create(req) {
    const { dataCheckin, cnhCondutor, cnhValidade, quilometragemCheckin, reservaId, veiculoId, funcionarioId } = req.body;
    const erros = [];

    const [reserva, funcionario] = await Promise.all([
      Reserva.findByPk(reservaId, { include: { all: true } }),
      Funcionario.findByPk(funcionarioId),
    ]);

    if (!reserva) erros.push("Reserva não encontrada!");
    if (!funcionario) erros.push("Funcionário não encontrado!");

    let veiculoFinalId = veiculoId;
    if (reserva) {
      veiculoFinalId = await verificarRegrasDeNegocio({ cnhCondutor, quilometragemCheckin, reserva, veiculoId, isUpdate: false, erros }) ?? veiculoFinalId;
    }

    erros.push(...await validarModel(Checkin.build({ dataCheckin, cnhCondutor, cnhValidade, quilometragemCheckin, reservaId, veiculoId: veiculoFinalId, funcionarioId })));

    if (erros.length > 0) throw erros.join(" ");

    return await sequelize.transaction(async (t) => {
      const obj = await Checkin.create({ dataCheckin, cnhCondutor, cnhValidade, quilometragemCheckin, reservaId, veiculoId: veiculoFinalId, funcionarioId }, { transaction: t });

      const veiculo = await Veiculo.findByPk(veiculoFinalId, { transaction: t });
      veiculo.status = 'Reservado';
      await veiculo.save({ transaction: t });

      reserva.status = 'Confirmada';
      await reserva.save({ transaction: t });

      return await Checkin.findByPk(obj.id, { include: { all: true }, transaction: t });
    });
  }

  static async update(req) {
    const { id } = req.params;
    const { dataCheckin, cnhCondutor, cnhValidade, quilometragemCheckin, veiculoId, funcionarioId } = req.body;

    const obj = await Checkin.findByPk(id, { include: { all: true } });
    if (obj == null) throw "Checkin não encontrado!";

    const erros = [];

    if (cnhCondutor !== undefined) {
      const reserva = await Reserva.findByPk(obj.reservaId, { include: { all: true } });
      if (reserva) await verificarRegrasDeNegocio({ cnhCondutor, reserva, isUpdate: true, erros });
    }

    // Troca de veículo: precisa liberar o antigo e reservar o novo, mantendo a frota consistente.
    const veiculoAntigoId = obj.veiculoId;
    const trocouVeiculo = veiculoId !== undefined && veiculoId !== veiculoAntigoId;
    if (trocouVeiculo) {
      if (obj.checkout) erros.push("Não é possível trocar o veículo de um check-in que já possui check-out!");
      const novoVeiculo = await Veiculo.findByPk(veiculoId);
      if (!novoVeiculo) erros.push("Veículo não encontrado!");
      else if (novoVeiculo.status !== 'Disponível') erros.push("O veículo selecionado não está disponível!");
    }

    const patch = { dataCheckin, cnhCondutor, cnhValidade, quilometragemCheckin, veiculoId, funcionarioId };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    Object.assign(obj, patch);

    erros.push(...await validarModel(obj));
    if (erros.length > 0) throw erros.join(" ");

    return await sequelize.transaction(async (t) => {
      if (trocouVeiculo) {
        const antigo = await Veiculo.findByPk(veiculoAntigoId, { transaction: t });
        if (antigo) { antigo.status = 'Disponível'; await antigo.save({ transaction: t }); }
        const novo = await Veiculo.findByPk(veiculoId, { transaction: t });
        novo.status = 'Reservado';
        await novo.save({ transaction: t });
      }
      await obj.save({ validate: false, transaction: t });
      return await Checkin.findByPk(obj.id, { include: { all: true }, transaction: t });
    });
  }

  static async delete(req) {
    const { id } = req.params;
    const obj = await Checkin.findByPk(id);
    if (obj == null) throw "Checkin não encontrado!";
    try {
      await obj.destroy();
      return obj;
    } catch (error) {
      throw "Não é possível remover este checkin pois está vinculado a outros registros.";
    }
  }
}

export { CheckinService };
