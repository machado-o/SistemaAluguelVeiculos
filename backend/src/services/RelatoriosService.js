import { QueryTypes } from "sequelize";
import sequelize from "../config/database-connection.js";

// Valida se inicio/termino são datas válidas e se termino >= inicio
function validarPeriodo(inicio, termino) {
  const erros = [];
  if (!inicio || !termino) {
    erros.push("Os campos 'inicio' e 'termino' são obrigatórios!");
    return erros;
  }

  const dataInicio  = new Date(inicio);
  const dataTermino = new Date(termino);

  if (isNaN(dataInicio.getTime()))  erros.push("O parâmetro 'inicio' não é uma data válida!");
  if (isNaN(dataTermino.getTime())) erros.push("O parâmetro 'termino' não é uma data válida!");
  if (erros.length === 0 && dataTermino < dataInicio)
    erros.push("A data 'termino' deve ser igual ou posterior à data 'inicio'!");

  return erros;
}

// Lê pagina/itensPorPagina da query string e calcula o deslocamento SQL
function parsePaginacao(query) {
  const pagina = Math.max(1, parseInt(query.pagina) || 1);
  const itensPorPagina = Math.min(100, Math.max(1, parseInt(query.itensPorPagina) || 20));
  const deslocamento = (pagina - 1) * itensPorPagina;
  return { pagina, itensPorPagina, deslocamento };
}

// Monta o envelope de resposta com metadados de paginação.
// extraFields: campos extras a extrair da primeira linha e remover de cada linha (ex: totalizadores globais).
function montarResposta(rows, pagina, itensPorPagina, extraFields = []) {
  const total = rows.length > 0 ? parseInt(rows[0].totalRegistros) : 0;
  const totalPaginas = Math.ceil(total / itensPorPagina) || 1;
  const extras = {};
  for (const field of extraFields) {
    extras[field] = rows.length > 0 ? parseInt(rows[0][field]) : 0;
  }
  const strip = new Set(['totalRegistros', ...extraFields]);
  const dados = rows.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => !strip.has(k))));
  return { dados, paginacao: { pagina, itensPorPagina, total, totalPaginas }, ...extras };
}

class RelatoriosService {

  // HENRIQUE

  // 1. Reservas realizadas por funcionário em um período informado.
  // Filtros: Funcionário (opcional) e Data (obrigatório).
  // Totalização: Quantidade e valor de reservas realizadas por um funcionário.

  static async findReservasPorFuncionario(req) {
    const { inicio, termino, funcionarioId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroFuncionario = funcionarioId ? `AND f.id = :funcionarioId` : "";

    const rows = await sequelize.query(
      `SELECT
        f.id                                                      AS "funcionarioId",
        f.nome                                                    AS "funcionarioNome",
        f.cargo,
        a.nome                                                    AS "agenciaNome",
        COUNT(r.id)                                               AS "quantidadeReservas",
        COALESCE(SUM(r.valor_final), 0)                           AS "valorTotal",
        ROUND(COALESCE(AVG(r.valor_final), 0)::numeric, 2)        AS "valorMedio",
        COUNT(CASE WHEN r.status = 'Concluída'  THEN 1 END)       AS "reservasConcluidas",
        COUNT(CASE WHEN r.status = 'Cancelada'  THEN 1 END)       AS "reservasCanceladas",
        COUNT(CASE WHEN r.status = 'Pendente'   THEN 1 END)       AS "reservasPendentes",
        COUNT(CASE WHEN r.status = 'Confirmada' THEN 1 END)       AS "reservasConfirmadas",
        SUM(COUNT(r.id)) OVER()                                   AS "totalReservasGlobal",
        SUM(SUM(r.valor_final)) OVER()                            AS "totalValorGlobal",
        COUNT(*) OVER()                                           AS "totalRegistros"
      FROM reservas r
      INNER JOIN funcionarios f ON r.funcionario_id = f.id
      INNER JOIN agencias a     ON f.agencia_id     = a.id
      WHERE r.data_retirada >= :inicio
        AND r.data_retirada <= :termino
        ${filtroFuncionario}
      GROUP BY f.id, f.nome, f.cargo, a.nome
      ORDER BY "quantidadeReservas" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, funcionarioId: funcionarioId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalReservasGlobal', 'totalValorGlobal']);
  }

  // 2. Reservas por categoria de veículo em um período informado.
  // Filtros: Categoria de Veículo (opcional) e Data (obrigatório).
  // Totalização: Quantidade e valor de reservas de uma categoria de veículo.

  static async findReservasPorCategoria(req) {
    const { inicio, termino, categoriaVeiculoId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroCategoria = categoriaVeiculoId ? `AND cv.id = :categoriaVeiculoId` : "";

    const rows = await sequelize.query(
      `SELECT
        cv.id                                                     AS "categoriaId",
        cv.nome                                                   AS "categoriaNome",
        cv.tipo_carroceria                                        AS "tipoCarroceria",
        cv.valor_diaria                                           AS "valorDiariaCadastrado",
        COUNT(r.id)                                               AS "quantidadeReservas",
        COALESCE(SUM(r.valor_final), 0)                           AS "valorTotal",
        ROUND(COALESCE(AVG(r.valor_final), 0)::numeric, 2)        AS "valorMedio",
        COUNT(DISTINCT r.cliente_id)                              AS "clientesUnicos",
        COUNT(DISTINCT r.funcionario_id)                          AS "funcionariosQueReservaram",
        COUNT(CASE WHEN r.status = 'Concluída' THEN 1 END)        AS "reservasConcluidas",
        COUNT(CASE WHEN r.status = 'Cancelada' THEN 1 END)        AS "reservasCanceladas",
        SUM(COUNT(r.id)) OVER()                                   AS "totalReservasGlobal",
        SUM(SUM(r.valor_final)) OVER()                            AS "totalValorGlobal",
        COUNT(*) OVER()                                           AS "totalRegistros"
      FROM reservas r
      INNER JOIN "categoriasVeiculos" cv ON r.categoria_veiculo_id = cv.id
      WHERE r.data_retirada >= :inicio
        AND r.data_retirada <= :termino
        ${filtroCategoria}
      GROUP BY cv.id, cv.nome, cv.tipo_carroceria, cv.valor_diaria
      ORDER BY "quantidadeReservas" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, categoriaVeiculoId: categoriaVeiculoId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalReservasGlobal', 'totalValorGlobal']);
  }

  // LORRAYNE

  // 3. Relatório de Check-ins realizados por agência por período.
  // Filtros: Agência (opcional) e Data (obrigatório).
  // Totalização: Quantidade de check-ins de uma agência.

  static async findCheckinsPorAgencia(req) {
    const { inicio, termino, agenciaId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroAgencia = agenciaId ? `AND a.id = :agenciaId` : "";

    const rows = await sequelize.query(
      `SELECT
        a.id                               AS "agenciaId",
        a.nome                             AS "agenciaNome",
        a.endereco,
        a.status                           AS "agenciaStatus",
        COUNT(ci.id)                       AS "quantidadeCheckins",
        COUNT(DISTINCT r.cliente_id)       AS "clientesUnicos",
        COUNT(DISTINCT ci.veiculo_id)      AS "veiculosUtilizados",
        COUNT(DISTINCT ci.funcionario_id)  AS "funcionariosEnvolvidos",
        (
          SELECT cl.nome
          FROM clientes cl
          INNER JOIN reservas r2  ON r2.cliente_id  = cl.id
          INNER JOIN checkins ci2 ON ci2.reserva_id = r2.id
          WHERE r2.agencia_retirada_id = a.id
            AND ci2.data_checkin >= :inicio
            AND ci2.data_checkin <= :termino
          GROUP BY cl.id, cl.nome
          ORDER BY COUNT(ci2.id) DESC
          LIMIT 1
        )                                  AS "clienteComMaisCheckins",
        SUM(COUNT(ci.id)) OVER()           AS "totalCheckinsGlobal",
        COUNT(*) OVER()                    AS "totalRegistros"
      FROM checkins ci
      INNER JOIN reservas r ON ci.reserva_id        = r.id
      INNER JOIN agencias a ON r.agencia_retirada_id = a.id
      WHERE ci.data_checkin >= :inicio
        AND ci.data_checkin <= :termino
        ${filtroAgencia}
      GROUP BY a.id, a.nome, a.endereco, a.status
      ORDER BY "quantidadeCheckins" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, agenciaId: agenciaId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalCheckinsGlobal']);
  }

  // 4. Check-ins agrupados por veículo em um período informado.
  // Filtros: Veículo (opcional) e Data (obrigatório).
  // Totalização: Quantidade de check-ins de um veículo.

  static async findCheckinsPorVeiculo(req) {
    const { inicio, termino, veiculoId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroVeiculo = veiculoId ? `AND v.id = :veiculoId` : "";

    const rows = await sequelize.query(
      `SELECT
        v.id                                                          AS "veiculoId",
        v.placa,
        v.marca,
        v.modelo,
        v.ano_fabricacao                                              AS "anoFabricacao",
        cv.nome                                                       AS "categoriaNome",
        COUNT(ci.id)                                                  AS "quantidadeCheckins",
        ROUND(AVG(ci.quilometragem_checkin)::numeric, 2)              AS "quilometragemMediaCheckin",
        MAX(ci.quilometragem_checkin)                                  AS "maiorQuilometragemCheckin",
        COUNT(DISTINCT r.cliente_id)                                  AS "clientesUnicos",
        (
          SELECT f.nome
          FROM funcionarios f
          INNER JOIN checkins ci2 ON ci2.funcionario_id = f.id
          WHERE ci2.veiculo_id = v.id
            AND ci2.data_checkin >= :inicio
            AND ci2.data_checkin <= :termino
          GROUP BY f.id, f.nome
          ORDER BY COUNT(ci2.id) DESC
          LIMIT 1
        )                                                             AS "funcionarioComMaisCheckins",
        SUM(COUNT(ci.id)) OVER()                                      AS "totalCheckinsGlobal",
        COUNT(*) OVER()                                               AS "totalRegistros"
      FROM checkins ci
      INNER JOIN veiculos v              ON ci.veiculo_id          = v.id
      INNER JOIN "categoriasVeiculos" cv ON v.categoria_veiculo_id = cv.id
      INNER JOIN reservas r              ON ci.reserva_id          = r.id
      WHERE ci.data_checkin >= :inicio
        AND ci.data_checkin <= :termino
        ${filtroVeiculo}
      GROUP BY v.id, v.placa, v.marca, v.modelo, v.ano_fabricacao, cv.nome
      ORDER BY "quantidadeCheckins" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, veiculoId: veiculoId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalCheckinsGlobal']);
  }

  // JULIA

  // 5. Check-outs com avarias registradas agrupadas por veículo em um período informado.
  // Filtros: Veículo (opcional) e Data (obrigatório).
  // Totalização: Quantidade e valor de avarias de um veículo.
  static async findCheckoutsComAvariasPorVeiculo(req) {
    const { inicio, termino, veiculoId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroVeiculo = veiculoId ? `AND v.id = :veiculoId` : "";

    const rows = await sequelize.query(
      `SELECT
        v.id                                                      AS "veiculoId",
        v.placa,
        v.marca,
        v.modelo,
        cv.nome                                                   AS "categoriaNome",
        COUNT(DISTINCT co.id)                                     AS "quantidadeCheckouts",
        COUNT(ca.avaria_id)                                       AS "quantidadeAvarias",
        COALESCE(SUM(av.valor), 0)                                AS "valorTotalAvarias",
        ROUND(COALESCE(AVG(av.valor), 0)::numeric, 2)             AS "valorMedioAvaria",
        MAX(av.valor)                                             AS "maiorValorAvaria",
        STRING_AGG(DISTINCT av.nome, ', ' ORDER BY av.nome)       AS "tiposAvarias",
        SUM(COUNT(ca.avaria_id)) OVER()                           AS "totalAvariasGlobal",
        SUM(SUM(av.valor)) OVER()                                 AS "totalValorAvariasGlobal",
        COUNT(*) OVER()                                           AS "totalRegistros"
      FROM checkouts co
      INNER JOIN checkins ci             ON co.checkin_id           = ci.id
      INNER JOIN veiculos v              ON ci.veiculo_id           = v.id
      INNER JOIN "categoriasVeiculos" cv ON v.categoria_veiculo_id  = cv.id
      INNER JOIN checkout_avaria ca      ON ca.checkout_id          = co.id
      INNER JOIN avarias av              ON av.id                   = ca.avaria_id
      WHERE co.data_checkout >= :inicio
        AND co.data_checkout <= :termino
        ${filtroVeiculo}
      GROUP BY v.id, v.placa, v.marca, v.modelo, cv.nome
      ORDER BY "quantidadeAvarias" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, veiculoId: veiculoId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalAvariasGlobal', 'totalValorAvariasGlobal']);
  }

  // 6. Check-outs com multas aplicadas a clientes em um período.
  // Filtros: Cliente (opcional) e Data (obrigatório, baseado na data do checkout).
  // Totalização: Quantidade e valor de multas de um cliente.
  static async findCheckoutsComMultasPorCliente(req) {
    const { inicio, termino, clienteId } = req.query;

    const erros = validarPeriodo(inicio, termino);
    if (erros.length > 0) throw erros.join(" ");

    const { pagina, itensPorPagina, deslocamento } = parsePaginacao(req.query);
    const filtroCliente = clienteId ? `AND cl.id = :clienteId` : "";

    const rows = await sequelize.query(
      `SELECT
        cl.id                                                                      AS "clienteId",
        cl.nome                                                                    AS "clienteNome",
        cl.cpf,
        cl.email,
        COUNT(DISTINCT co.id)                                                      AS "quantidadeCheckouts",
        COUNT(m.id)                                                                AS "quantidadeMultas",
        COALESCE(SUM(m.valor), 0)                                                  AS "valorTotalMultas",
        COUNT(CASE WHEN m.status = 'Pendente' THEN 1 END)                          AS "multasPendentes",
        COUNT(CASE WHEN m.status = 'Paga'     THEN 1 END)                          AS "multasPagas",
        COALESCE(SUM(CASE WHEN m.status = 'Pendente' THEN m.valor ELSE 0 END), 0)  AS "valorMultasPendentes",
        COALESCE(SUM(co.taxa_inspecao), 0)                                          AS "totalTaxasInspecao",
        SUM(COUNT(m.id)) OVER()                                                     AS "totalMultasGlobal",
        SUM(SUM(m.valor)) OVER()                                                    AS "totalValorMultasGlobal",
        COUNT(*) OVER()                                                             AS "totalRegistros"
      FROM checkouts co
      INNER JOIN checkins ci ON co.checkin_id = ci.id
      INNER JOIN reservas r  ON ci.reserva_id = r.id
      INNER JOIN clientes cl ON r.cliente_id  = cl.id
      INNER JOIN multas m    ON m.reserva_id  = r.id
      WHERE co.data_checkout >= :inicio
        AND co.data_checkout <= :termino
        ${filtroCliente}
      GROUP BY cl.id, cl.nome, cl.cpf, cl.email
      ORDER BY "valorTotalMultas" DESC
      LIMIT :limite OFFSET :deslocamento`,
      {
        replacements: { inicio, termino, clienteId: clienteId ?? null, limite: itensPorPagina, deslocamento },
        type: QueryTypes.SELECT,
      }
    );

    return montarResposta(rows, pagina, itensPorPagina, ['totalMultasGlobal', 'totalValorMultasGlobal']);
  }

}

export { RelatoriosService };
