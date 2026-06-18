import { Veiculo } from "../models/Veiculo.js";
import { CategoriaVeiculo } from "../models/CategoriaVeiculo.js";
import { Agencia } from "../models/Agencia.js";
import { validarModel } from "./_validarModel.js";

class VeiculoService {

  static async findAll() {
    return await Veiculo.findAll({ include: { all: true } });
  }

  static async findByPk(req) {
    const { id } = req.params;
    return await Veiculo.findByPk(id, { include: { all: true } });
  }

  static async create(req) {
    const { status, marca, modelo, cor, anoFabricacao, quilometragem, categoriaVeiculoId, agenciaId } = req.body;
    const placa  = req.body.placa?.toUpperCase().trim();
    const chassi = req.body.chassi?.toUpperCase().trim();
    const erros = [];

    const [categoria, agencia] = await Promise.all([
      CategoriaVeiculo.findByPk(categoriaVeiculoId),
      Agencia.findByPk(agenciaId),
    ]);

    if (!categoria) erros.push("Categoria de veículo não encontrada!");
    if (!agencia) erros.push("Agência não encontrada!");

    erros.push(...await validarModel(Veiculo.build({ placa, chassi, status, marca, modelo, cor, anoFabricacao, quilometragem, categoriaVeiculoId, agenciaId })));

    if (erros.length > 0) throw erros.join(" ");

    const obj = await Veiculo.create({ placa, chassi, status, marca, modelo, cor, anoFabricacao, quilometragem, categoriaVeiculoId, agenciaId });
    return await Veiculo.findByPk(obj.id, { include: { all: true } });
  }

  static async update(req) {
    const { id } = req.params;
    const { status, marca, modelo, cor, anoFabricacao, quilometragem, categoriaVeiculoId, agenciaId } = req.body;
    const placa  = req.body.placa  != null ? req.body.placa.toUpperCase().trim()  : undefined;
    const chassi = req.body.chassi != null ? req.body.chassi.toUpperCase().trim() : undefined;

    const obj = await Veiculo.findByPk(id, { include: { all: true } });
    if (obj == null) throw 'Veículo não encontrado!';

    const erros = [];

    if (categoriaVeiculoId !== undefined) {
      const categoria = await CategoriaVeiculo.findByPk(categoriaVeiculoId);
      if (!categoria) erros.push("Categoria de veículo não encontrada!");
    }
    if (agenciaId !== undefined) {
      const agencia = await Agencia.findByPk(agenciaId);
      if (!agencia) erros.push("Agência não encontrada!");
    }

    const patch = { placa, chassi, status, marca, modelo, cor, anoFabricacao, quilometragem, categoriaVeiculoId, agenciaId };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    Object.assign(obj, patch);

    erros.push(...await validarModel(obj));

    if (erros.length > 0) throw erros.join(" ");

    await obj.save({ validate: false });
    return await Veiculo.findByPk(obj.id, { include: { all: true } });
  }

  static async delete(req) {
    const { id } = req.params;
    const obj = await Veiculo.findByPk(id);
    if (obj == null) throw 'Veiculo não encontrado!';
    try {
      await obj.destroy();
      return obj;
    } catch (error) {
      throw "Não é possível remover este veículo pois está vinculado a outros registros!";
    }
  }
}

export { VeiculoService };
