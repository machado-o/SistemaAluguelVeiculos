import Sequelize from 'sequelize';
import { databaseConfig } from "./database-config.js";

import { Agencia } from '../models/Agencia.js';
import { Avaria } from '../models/Avaria.js';
import { CategoriaVeiculo } from '../models/CategoriaVeiculo.js';
import { Checkin } from '../models/Checkin.js';
import { Checkout } from '../models/Checkout.js';
import { Cliente } from '../models/Cliente.js';
import { Cobertura } from '../models/Cobertura.js';
import { Funcionario } from '../models/Funcionario.js';
import { Multa } from '../models/Multa.js';
import { Reserva } from '../models/Reserva.js';
import { Seguro } from '../models/Seguro.js';
import { Veiculo } from '../models/Veiculo.js';

const sequelize = new Sequelize(databaseConfig);

Agencia.init(sequelize);
Avaria.init(sequelize);
CategoriaVeiculo.init(sequelize);
Checkin.init(sequelize);
Checkout.init(sequelize);
Cliente.init(sequelize);
Cobertura.init(sequelize);
Funcionario.init(sequelize);
Multa.init(sequelize);
Reserva.init(sequelize);
Seguro.init(sequelize);
Veiculo.init(sequelize);

Agencia.associate(sequelize.models);
Avaria.associate(sequelize.models);
CategoriaVeiculo.associate(sequelize.models);
Checkin.associate(sequelize.models);
Checkout.associate(sequelize.models);
Cliente.associate(sequelize.models);
Cobertura.associate(sequelize.models);
Funcionario.associate(sequelize.models);
Multa.associate(sequelize.models);
Reserva.associate(sequelize.models);
Seguro.associate(sequelize.models);
Veiculo.associate(sequelize.models);

databaseInserts(); // comentar quando estiver em ambiente de produção (não criar tabelas e não inserir registros de teste)

function databaseInserts() {
    (async () => {

        await sequelize.sync({ force: true });
        const toDateOnly = (d) => d.toISOString().slice(0, 10);
        const plusDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
        const fmt = (date, hhmm) => `${toDateOnly(date)} ${hhmm}:00`;

        // ─── AGÊNCIAS ───────────────────────────────────────────────────────────
        // agencia4 (Inativa) → testa RN agência de retirada/devolução inativa
        const agencia1 = await Agencia.create({ nome: "Agência Cachoeiro", cnpj: "12.345.678/0001-90", endereco: "Av. Jones dos Santos Neves, 100", telefone: "(28) 3333-4444", status: "Ativa", limiteDiasDesconto: 3, percentualDesconto: 10.00 });
        const agencia2 = await Agencia.create({ nome: "Agência Vitória", cnpj: "98.765.432/0001-10", endereco: "Av. Nossa Senhora da Penha, 500", telefone: "(27) 99999-1111", status: "Ativa", limiteDiasDesconto: 5, percentualDesconto: 15.00 });
        const agencia3 = await Agencia.create({ nome: "Agência Vila Velha", cnpj: "45.987.123/0001-77", endereco: "Rua Sete de Setembro, 280", telefone: "(27) 3322-1100", status: "Ativa", limiteDiasDesconto: 7, percentualDesconto: 12.00 });
        const agencia4 = await Agencia.create({ nome: "Agência Serra", cnpj: "77.123.456/0001-55", endereco: "Av. Central, 890", telefone: "(27) 3344-2233", status: "Inativa", limiteDiasDesconto: 7, percentualDesconto: 10.00 });
        // agencia5 (id=5): sem funcionários, veículos ou reservas → exclusiva para DELETE
        const agencia5 = await Agencia.create({ nome: "Agência Linhares", cnpj: "33.444.555/0001-66", endereco: "Rua Central, 150, Linhares", telefone: "(27) 3355-6677", status: "Ativa", limiteDiasDesconto: 5, percentualDesconto: 8.00 });

        // ─── FUNCIONÁRIOS ───────────────────────────────────────────────────────
        const func1 = await Funcionario.create({ nome: "Emanuelly", cpf: "111.111.111-11", cargo: "Gerente", dataNascimento: "1990-02-10", telefone: "(28) 3333-1111", email: "emanuelly@example.com", senha: "Senha@1234", agenciaId: agencia1.id });
        const func2 = await Funcionario.create({ nome: "Carlos", cpf: "222.222.222-22", cargo: "Atendente", dataNascimento: "1998-06-20", telefone: "(27) 99999-2222", email: "carlos@example.com", senha: "Senha@1234", agenciaId: agencia2.id });
        const func3 = await Funcionario.create({ nome: "Juliana", cpf: "444.444.444-44", cargo: "Atendente", dataNascimento: "1995-11-03", telefone: "(27) 98123-4567", email: "juliana@example.com", senha: "Senha@1234", agenciaId: agencia3.id });
        const func4 = await Funcionario.create({ nome: "Rafael", cpf: "555.555.555-55", cargo: "Gerente", dataNascimento: "1987-09-12", telefone: "(27) 98888-1212", email: "rafael@example.com", senha: "Senha@1234", agenciaId: agencia4.id });
        // func5 (id=5): sem reservas, checkins ou checkouts → exclusiva para DELETE
        const func5 = await Funcionario.create({ nome: "Amanda", cpf: "100.100.100-10", cargo: "Atendente", dataNascimento: "2000-01-15", telefone: "(27) 97777-0001", email: "amanda@example.com", senha: "Senha@1234", agenciaId: agencia1.id });

        // ─── CLIENTES ───────────────────────────────────────────────────────────
        // cliente1 (Henrique, CNH 12345678901): tem Multa Pendente → testa RN débitos pendentes (reserva8)
        const cliente1 = await Cliente.create({ nome: "Henrique", cpf: "333.333.333-33", email: "henrique@email.com", dataNascimento: "2000-05-15", telefone: "(28) 3333-2222", cnh: "12345678901", categoriaCnh: "B", validadeCnh: "2030-01-01", endereco: "Rua Exemplo, 123" });
        // cliente2 (Marina, CNH 23456789012): sem multas, reserva7 Pendente → testa check-in válido / CNH errada / veículo inválido
        const cliente2 = await Cliente.create({ nome: "Marina", cpf: "666.666.666-66", email: "marina@email.com", dataNascimento: "1997-08-22", telefone: "(27) 97777-6666", cnh: "23456789012", categoriaCnh: "AB", validadeCnh: "2029-12-31", endereco: "Rua das Flores, 50" });
        // cliente3 (Paulo, CNH 34567890123): sem multas, reserva9 Confirmada + checkin7 ativo → testa checkout
        const cliente3 = await Cliente.create({ nome: "Paulo", cpf: "777.777.777-77", email: "paulo@email.com", dataNascimento: "1992-03-09", telefone: "(27) 96666-4444", cnh: "34567890123", categoriaCnh: "B", validadeCnh: "2031-06-10", endereco: "Av. Beira Mar, 900" });
        // cliente4 (Renata, CNH 45678901234): tem Multa Pendente
        const cliente4 = await Cliente.create({ nome: "Renata", cpf: "888.888.888-88", email: "renata@email.com", dataNascimento: "1989-12-30", telefone: "(28) 95555-3333", cnh: "45678901234", categoriaCnh: "D", validadeCnh: "2028-04-25", endereco: "Rua Santa Clara, 18" });
        // cliente5 (Lucas, CNH 56789012345): sem multas, 4 avarias históricas → testa taxa de inspeção (checkin8)
        const cliente5 = await Cliente.create({ nome: "Lucas", cpf: "999.999.999-99", email: "lucas@email.com", dataNascimento: "1994-07-11", telefone: "(27) 94444-5555", cnh: "56789012345", categoriaCnh: "B", validadeCnh: "2032-03-15", endereco: "Rua das Palmeiras, 77" });
        // cliente6 (id=6): sem reservas nem multas → exclusiva para DELETE
        const cliente6 = await Cliente.create({ nome: "Beatriz", cpf: "100.200.300-04", email: "beatriz@email.com", dataNascimento: "1998-09-15", telefone: "(27) 93333-1111", cnh: "10203040506", categoriaCnh: "B", validadeCnh: "2031-01-01", endereco: "Rua Nova, 55, Vitória" });

        // ─── CATEGORIAS ─────────────────────────────────────────────────────────
        // catEconomico (id=1): inserida PRIMEIRO para ter o menor id — upgrade busca id > categoriaVeiculoId,
        //   portanto reserva_upgrade (catEconomico, sem veículos Disponíveis) faz upgrade para catHatch (id=2)
        const catEconomico = await CategoriaVeiculo.create({ nome: "Econômico Compacto", valorDiaria:  70.00, tipoCarroceria: "Hatch",  propulsao: "Combustão", cambio: "Manual",     arCondicionado: false, capacidade: 5 });
        const catHatch     = await CategoriaVeiculo.create({ nome: "Hatch Compacto",     valorDiaria: 100.00, tipoCarroceria: "Hatch",  propulsao: "Híbrido",   cambio: "Automático", arCondicionado: true,  capacidade: 5 });
        const catSUV       = await CategoriaVeiculo.create({ nome: "SUV Premium",         valorDiaria: 350.00, tipoCarroceria: "SUV",    propulsao: "Combustão", cambio: "Automático", arCondicionado: true,  capacidade: 5 });
        const catSedan     = await CategoriaVeiculo.create({ nome: "Sedan Executivo",     valorDiaria: 220.00, tipoCarroceria: "Sedan",  propulsao: "Elétrico",  cambio: "Automático", arCondicionado: true,  capacidade: 5 });
        const catPicape    = await CategoriaVeiculo.create({ nome: "Picape Utilitária",   valorDiaria: 280.00, tipoCarroceria: "Picape", propulsao: "Combustão", cambio: "Manual",     arCondicionado: false, capacidade: 5 });
        // catExtra (id=6): sem veículos nem reservas → exclusiva para DELETE
        const catExtra     = await CategoriaVeiculo.create({ nome: "Esportivo Elétrico",   valorDiaria: 420.00, tipoCarroceria: "Sedan",  propulsao: "Elétrico",  cambio: "Automático", arCondicionado: true,  capacidade: 4 });

        // ─── VEÍCULOS ───────────────────────────────────────────────────────────
        // veiculoEco1 (id=1) e veiculoEco2 (id=2): catEconomico, ambos Reservados no seed
        //   → garantem que catEconomico não tem veículos Disponíveis → aciona upgrade na reserva_upgrade
        const veiculoEco1 = await Veiculo.create({ placa: "ECO1A11", chassi: "9BWZZZ37ZVT000006", status: "Reservado", marca: "Fiat",      modelo: "Mobi", cor: "Outra", anoFabricacao: "2021", quilometragem: 32000.00, categoriaVeiculoId: catEconomico.id, agenciaId: agencia1.id });
        const veiculoEco2 = await Veiculo.create({ placa: "ECO2B22", chassi: "9BWZZZ37ZVT000007", status: "Reservado", marca: "Chevrolet", modelo: "Joy",  cor: "Preto",  anoFabricacao: "2020", quilometragem: 45000.00, categoriaVeiculoId: catEconomico.id, agenciaId: agencia1.id });
        // veiculo1 (id=3, Hatch, Disponível): destino primário de upgrade e check-in da reserva_ci_valido
        const veiculo1 = await Veiculo.create({ placa: "ABC1D23", chassi: "9BWZZZ37ZVT000001", status: "Disponível", marca: "BYD",        modelo: "Dolphin", cor: "Preto", anoFabricacao: "2024", quilometragem: 1500.50,  categoriaVeiculoId: catHatch.id,  agenciaId: agencia1.id });
        // veiculo2 (id=4, SUV, ficará Reservado via checkin8)
        const veiculo2 = await Veiculo.create({ placa: "XYZ9A87", chassi: "9BWZZZ37ZVT000002", status: "Disponível", marca: "Jeep",       modelo: "Compass", cor: "Branco", anoFabricacao: "2023", quilometragem: 25000.00, categoriaVeiculoId: catSUV.id,    agenciaId: agencia2.id });
        // veiculo3 (id=5, Sedan, ficará Reservado via checkin7)
        const veiculo3 = await Veiculo.create({ placa: "QWE2R34", chassi: "9BWZZZ37ZVT000003", status: "Disponível", marca: "Toyota",     modelo: "Corolla", cor: "Prata", anoFabricacao: "2022", quilometragem: 31000.10, categoriaVeiculoId: catSedan.id,  agenciaId: agencia3.id });
        // veiculo4 (id=6, Picape, Disponível)
        const veiculo4 = await Veiculo.create({ placa: "RTY4U56", chassi: "9BWZZZ37ZVT000004", status: "Disponível", marca: "Fiat",       modelo: "Toro",    cor: "Cinza", anoFabricacao: "2021", quilometragem: 40210.45, categoriaVeiculoId: catPicape.id, agenciaId: agencia1.id });
        // veiculo5 (id=7, Hatch, Reservado): testa RN veículo não disponível — use veiculoId=7 no teste de erro
        const veiculo5 = await Veiculo.create({ placa: "MNO3P45", chassi: "9BWZZZ37ZVT000005", status: "Reservado", marca: "Volkswagen", modelo: "Gol",     cor: "Prata", anoFabricacao: "2023", quilometragem: 8500.00,  categoriaVeiculoId: catHatch.id,  agenciaId: agencia1.id });
        // veiculo6 (id=8, Hatch, Disponível): veículo reserva — garante que catHatch tem disponibilidade mesmo que veiculo1 seja consumido por um check-in ou upgrade
        const veiculo6 = await Veiculo.create({ placa: "HAT6F66", chassi: "9BWZZZ37ZVT000008", status: "Disponível", marca: "Ford",       modelo: "Ka",      cor: "Branco", anoFabricacao: "2022", quilometragem: 12000.00, categoriaVeiculoId: catHatch.id,  agenciaId: agencia1.id });

        // ─── COBERTURAS E SEGUROS ────────────────────────────────────────────────
        const cobRoubo    = await Cobertura.create({ nome: "Roubo e Furto",       valorIndenizacaoMax: 50000.00 });
        const cobBatida   = await Cobertura.create({ nome: "Colisão Total",       valorIndenizacaoMax: 80000.00 });
        const cobVidros   = await Cobertura.create({ nome: "Danos a Vidros",      valorIndenizacaoMax: 2000.00  });
        const cobTerceiros = await Cobertura.create({ nome: "Danos a Terceiros", valorIndenizacaoMax: 100000.00 });
        // cobExtra (id=5): sem seguros vinculados → exclusiva para DELETE
        const cobExtra = await Cobertura.create({ nome: "Perda Total",          valorIndenizacaoMax: 120000.00 });

        const seguroOuro   = await Seguro.create({ nome: "Plano Ouro",   empresaSeguradora: "Porto Seguro",      valorDiariaAdicional: 50.00, franquia: 1500.00 });
        const seguroBasico = await Seguro.create({ nome: "Plano Básico", empresaSeguradora: "Allianz",           valorDiariaAdicional: 20.00, franquia: 4000.00 });
        const seguroPrata  = await Seguro.create({ nome: "Plano Prata",  empresaSeguradora: "Bradesco Seguros",  valorDiariaAdicional: 35.00, franquia: 2500.00 });
        const seguroPlus   = await Seguro.create({ nome: "Plano Plus",   empresaSeguradora: "Tokio Marine",      valorDiariaAdicional: 60.00, franquia: 1000.00 });

        await seguroOuro.addCoberturas([cobRoubo, cobBatida, cobVidros, cobTerceiros]);
        await seguroBasico.addCoberturas([cobRoubo]);
        await seguroPrata.addCoberturas([cobRoubo, cobBatida]);
        await seguroPlus.addCoberturas([cobRoubo, cobBatida, cobTerceiros]);

        // ─── RESERVAS HISTÓRICAS (Concluídas) ───────────────────────────────────
        const reserva1 = await Reserva.create({ dataRetirada: fmt(plusDays(-30), "08:00"), dataDevolucao: fmt(plusDays(-26), "18:00"), valorDiaria: 350.00, quantidadeDias: 4, valorSeguro: 200.00, valorFinal: 1980.00, status: "Concluída", clienteId: cliente1.id, categoriaVeiculoId: catSUV.id,    funcionarioId: func1.id, seguroId: seguroOuro.id,   agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });
        const reserva2 = await Reserva.create({ dataRetirada: fmt(plusDays(-28), "09:30"), dataDevolucao: fmt(plusDays(-24), "17:30"), valorDiaria: 100.00, quantidadeDias: 4, valorSeguro:  80.00, valorFinal:  432.00, status: "Concluída", clienteId: cliente2.id, categoriaVeiculoId: catHatch.id,  funcionarioId: func2.id, seguroId: seguroBasico.id, agenciaRetiradaId: agencia2.id, agenciaDevolucaoId: agencia3.id });
        const reserva3 = await Reserva.create({ dataRetirada: fmt(plusDays(-25), "10:00"), dataDevolucao: fmt(plusDays(-20), "16:00"), valorDiaria: 220.00, quantidadeDias: 5, valorSeguro: 175.00, valorFinal: 1275.00, status: "Concluída", clienteId: cliente3.id, categoriaVeiculoId: catSedan.id,  funcionarioId: func3.id, seguroId: seguroPrata.id,  agenciaRetiradaId: agencia3.id, agenciaDevolucaoId: agencia2.id });
        const reserva4 = await Reserva.create({ dataRetirada: fmt(plusDays(-22), "07:45"), dataDevolucao: fmt(plusDays(-19), "15:15"), valorDiaria: 280.00, quantidadeDias: 3, valorSeguro: 180.00, valorFinal: 1116.00, status: "Concluída", clienteId: cliente4.id, categoriaVeiculoId: catPicape.id, funcionarioId: func4.id, seguroId: seguroPlus.id,   agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });
        // reservas 5 e 6: histórico de avarias do cliente5 → 4 avarias totais → taxa de inspeção aplica
        const reserva5 = await Reserva.create({ dataRetirada: fmt(plusDays(-40), "08:00"), dataDevolucao: fmt(plusDays(-35), "18:00"), valorDiaria: 100.00, quantidadeDias: 5, valorSeguro:   0.00, valorFinal:  500.00, status: "Concluída", clienteId: cliente5.id, categoriaVeiculoId: catHatch.id,  funcionarioId: func1.id, agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });
        const reserva6 = await Reserva.create({ dataRetirada: fmt(plusDays(-20), "08:00"), dataDevolucao: fmt(plusDays(-15), "18:00"), valorDiaria: 350.00, quantidadeDias: 5, valorSeguro:   0.00, valorFinal: 1487.50, status: "Concluída", clienteId: cliente5.id, categoriaVeiculoId: catSUV.id,    funcionarioId: func2.id, agenciaRetiradaId: agencia2.id, agenciaDevolucaoId: agencia2.id });

        // ─── RESERVAS PENDENTES (testes de check-in) ────────────────────────────
        // reserva7 (id=7): cliente2 (sem multas, CNH "23456789012"), catHatch (id=2), 2030-02-01→08
        //   → EXCLUSIVA para testes de ERRO — falhas não alteram estado, pode ser reutilizada em qualquer ordem:
        //     • CNH errada:           cnhCondutor="00000000000", veiculoId=3
        //     • Veículo indisponível: cnhCondutor="23456789012", veiculoId=7 (veiculo5, Reservado)
        //     • Categoria errada:     cnhCondutor="23456789012", veiculoId=5 (veiculo3, Sedan)
        //     • Conflito de período:  tentar criar nova reserva para clienteId=2 em 2030-02-01→08
        const reserva7 = await Reserva.create({ dataRetirada: "2030-02-01 08:00:00", dataDevolucao: "2030-02-08 18:00:00", valorDiaria: 100.00, quantidadeDias: 7, valorSeguro: 0.00, valorFinal: 630.00, status: "Pendente", clienteId: cliente2.id, categoriaVeiculoId: catHatch.id, funcionarioId: func1.id, agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia2.id });
        // reserva8 (id=8): cliente1 (Multa Pendente), catSUV, datas 2030-03-01→05
        //   → testa RN débitos pendentes — falha, não altera estado, pode ser testada em qualquer ordem
        //     • cnhCondutor="12345678901", veiculoId=4 → deve retornar 400 "cliente possui débitos pendentes"
        const reserva8 = await Reserva.create({ dataRetirada: "2030-03-01 08:00:00", dataDevolucao: "2030-03-05 18:00:00", valorDiaria: 350.00, quantidadeDias: 4, valorSeguro: 0.00, valorFinal: 1260.00, status: "Pendente", clienteId: cliente1.id, categoriaVeiculoId: catSUV.id,   funcionarioId: func1.id, agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });
        // ─── RESERVAS COM CHECKIN ATIVO (sem checkout — testes de checkout) ─────
        // reserva9 (id=9): cliente3, catSedan → para testes de quilometragem/data inválidas no checkout (checkin7)
        const reserva9  = await Reserva.create({ dataRetirada: "2026-01-10 08:00:00", dataDevolucao: "2026-01-20 18:00:00", valorDiaria: 220.00, quantidadeDias: 10, valorSeguro: 0.00, valorFinal: 1936.00, status: "Pendente", clienteId: cliente3.id, categoriaVeiculoId: catSedan.id, funcionarioId: func3.id, agenciaRetiradaId: agencia3.id, agenciaDevolucaoId: agencia3.id });
        // reserva10 (id=10): cliente5 (>3 avarias históricas), catSUV → para testar taxa de inspeção (checkin8)
        const reserva10 = await Reserva.create({ dataRetirada: "2026-04-01 08:00:00", dataDevolucao: "2026-04-10 18:00:00", valorDiaria: 350.00, quantidadeDias:  9, valorSeguro: 0.00, valorFinal: 2677.50, status: "Pendente", clienteId: cliente5.id, categoriaVeiculoId: catSUV.id,   funcionarioId: func2.id, agenciaRetiradaId: agencia2.id, agenciaDevolucaoId: agencia2.id });

        // reserva_upgrade (id=11): cliente2, catEconomico (id=1, TODOS veículos Reservados), 2030-04-01→05
        //   → testa upgrade automático de categoria — sem veiculoId no body; sistema seleciona veiculo catHatch
        //     • POST /checkins: reservaId=11, cnhCondutor="23456789012", funcionarioId=1 (sem veiculoId)
        //     • Esperado: 201 com veículo de catHatch no retorno; reserva vira Confirmada
        const reserva_upgrade = await Reserva.create({ dataRetirada: "2030-04-01 08:00:00", dataDevolucao: "2030-04-05 18:00:00", valorDiaria: 70.00, quantidadeDias: 4, valorSeguro: 0.00, valorFinal: 280.00, status: "Pendente", clienteId: cliente2.id, categoriaVeiculoId: catEconomico.id, funcionarioId: func1.id, agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });
        // reserva_ci_valido (id=12): cliente2, catHatch (id=2), 2030-05-01→05 — datas distintas de reserva7 e reserva_upgrade
        //   → EXCLUSIVA para teste de check-in válido — consome a reserva (vira Confirmada)
        //     • POST /checkins: reservaId=12, veiculoId=3 (ou 8), cnhCondutor="23456789012", funcionarioId=1
        //     • Esperado: 201; reserva vira Confirmada, veículo vira Reservado
        const reserva_ci_valido = await Reserva.create({ dataRetirada: "2030-05-01 08:00:00", dataDevolucao: "2030-05-05 18:00:00", valorDiaria: 100.00, quantidadeDias: 4, valorSeguro: 0.00, valorFinal: 400.00, status: "Pendente", clienteId: cliente2.id, categoriaVeiculoId: catHatch.id,     funcionarioId: func1.id, agenciaRetiradaId: agencia1.id, agenciaDevolucaoId: agencia1.id });

        // ─── CHECKINS HISTÓRICOS ────────────────────────────────────────────────
        const checkin1 = await Checkin.create({ dataCheckin: fmt(plusDays(-30), "08:10"), quilometragemCheckin: 25000.00, cnhCondutor: cliente1.cnh, cnhValidade: cliente1.validadeCnh, reservaId: reserva1.id, veiculoId: veiculo2.id, funcionarioId: func1.id });
        const checkin2 = await Checkin.create({ dataCheckin: fmt(plusDays(-28), "09:40"), quilometragemCheckin:  1600.00, cnhCondutor: cliente2.cnh, cnhValidade: cliente2.validadeCnh, reservaId: reserva2.id, veiculoId: veiculo1.id, funcionarioId: func2.id });
        const checkin3 = await Checkin.create({ dataCheckin: fmt(plusDays(-25), "10:20"), quilometragemCheckin: 31200.00, cnhCondutor: cliente3.cnh, cnhValidade: cliente3.validadeCnh, reservaId: reserva3.id, veiculoId: veiculo3.id, funcionarioId: func3.id });
        const checkin4 = await Checkin.create({ dataCheckin: fmt(plusDays(-22), "08:00"), quilometragemCheckin: 40300.00, cnhCondutor: cliente4.cnh, cnhValidade: cliente4.validadeCnh, reservaId: reserva4.id, veiculoId: veiculo4.id, funcionarioId: func4.id });
        // checkins 5 e 6: histórico de avarias do cliente5
        const checkin5 = await Checkin.create({ dataCheckin: fmt(plusDays(-40), "08:10"), quilometragemCheckin:  1500.50, cnhCondutor: cliente5.cnh, cnhValidade: cliente5.validadeCnh, reservaId: reserva5.id, veiculoId: veiculo1.id, funcionarioId: func1.id });
        const checkin6 = await Checkin.create({ dataCheckin: fmt(plusDays(-20), "08:10"), quilometragemCheckin: 25000.00, cnhCondutor: cliente5.cnh, cnhValidade: cliente5.validadeCnh, reservaId: reserva6.id, veiculoId: veiculo2.id, funcionarioId: func2.id });

        // ─── CHECKINS ATIVOS (sem checkout) ─────────────────────────────────────
        // checkin7 (id=7): reserva9 (id=9, cliente3, catSedan, veiculo3 id=5), dataCheckin=2026-01-10, quilometragemCheckin=50000
        //   → testes de ERRO no checkout (falhas não alteram estado, pode testar em qualquer ordem):
        //     • Quilometragem inválida: POST /checkouts checkinId=7, quilometragemCheckout=40000 → 400
        //     • Data anterior:         POST /checkouts checkinId=7, dataCheckout="2026-01-09 08:00:00" → 400
        //   → checkout VÁLIDO sem taxa de inspeção: quilometragemCheckout > 50000, dataCheckout >= "2026-01-10 08:00:00"
        //     • cliente3 tem 1 avaria histórica (checkout3) → totalAvarias < 3 → taxaInspecao = 0
        const checkin7 = await Checkin.create({ dataCheckin: "2026-01-10 08:00:00", quilometragemCheckin: 50000.00, cnhCondutor: cliente3.cnh, cnhValidade: cliente3.validadeCnh, reservaId: reserva9.id,  veiculoId: veiculo3.id, funcionarioId: func3.id });
        // checkin8 (id=8): reserva10 (id=10, cliente5, catSUV, veiculo2 id=4), dataCheckin=2026-04-01, quilometragemCheckin=25000
        //   → checkout VÁLIDO com taxa de inspeção:
        //     • cliente5 tem 4 avarias históricas (checkout5: 2, checkout6: 2) → totalAvarias > 3 → taxaInspecao = R$ 150,00
        //     • max quilometragem histórica do veiculo2 = 25800 (checkout6) → quilometragemCheckout deve ser > 25800
        //     • POST /checkouts: checkinId=8, quilometragemCheckout=26000, dataCheckout="2026-04-10 17:00:00"
        const checkin8 = await Checkin.create({ dataCheckin: "2026-04-01 08:00:00", quilometragemCheckin: 25000.00, cnhCondutor: cliente5.cnh, cnhValidade: cliente5.validadeCnh, reservaId: reserva10.id, veiculoId: veiculo2.id, funcionarioId: func2.id });

        // Atualizar status dos veículos e reservas referentes aos checkins ativos
        await veiculo3.update({ status: "Reservado" });
        await reserva9.update({ status: "Confirmada" });
        await veiculo2.update({ status: "Reservado" });
        await reserva10.update({ status: "Confirmada" });

        // ─── AVARIAS ────────────────────────────────────────────────────────────
        const avaria1 = await Avaria.create({ nome: "Arranhão na porta",          valor: 350.00 });
        const avaria2 = await Avaria.create({ nome: "Parachoque trincado",        valor: 900.00 });
        const avaria3 = await Avaria.create({ nome: "Retrovisor quebrado",        valor: 450.00 });
        const avaria4 = await Avaria.create({ nome: "Lanterna traseira queimada", valor: 180.00 });
        const avaria5 = await Avaria.create({ nome: "Vidro lateral trincado",     valor: 600.00 });
        // avaria6 (id=6): sem checkouts vinculados → exclusiva para DELETE
        const avaria6 = await Avaria.create({ nome: "Calota amassada",            valor: 120.00 });

        // ─── CHECKOUTS HISTÓRICOS ───────────────────────────────────────────────
        const checkout1 = await Checkout.create({ dataCheckout: fmt(plusDays(-26), "17:30"), quilometragemCheckout: 25400.00, nivelCombustivel: "Médio", condicaoPneus: "Bom",    condicaoPalhetas: "Boas",       limpoInternamente: false, limpoExternamente: true,  taxaInspecao: 0, checkinId: checkin1.id, funcionarioId: func2.id });
        const checkout2 = await Checkout.create({ dataCheckout: fmt(plusDays(-24), "16:45"), quilometragemCheckout:  1880.00, nivelCombustivel: "Alto",  condicaoPneus: "Regular", condicaoPalhetas: "Boas",       limpoInternamente: true,  limpoExternamente: true,  taxaInspecao: 0, checkinId: checkin2.id, funcionarioId: func1.id });
        const checkout3 = await Checkout.create({ dataCheckout: fmt(plusDays(-20), "15:10"), quilometragemCheckout: 31800.00, nivelCombustivel: "Baixo", condicaoPneus: "Ruim",    condicaoPalhetas: "Ressecadas", limpoInternamente: false, limpoExternamente: false, taxaInspecao: 0, checkinId: checkin3.id, funcionarioId: func4.id });
        const checkout4 = await Checkout.create({ dataCheckout: fmt(plusDays(-19), "14:50"), quilometragemCheckout: 40900.00, nivelCombustivel: "Vazio", condicaoPneus: "Furado",  condicaoPalhetas: "Quebradas",  limpoInternamente: true,  limpoExternamente: false, taxaInspecao: 0, checkinId: checkin4.id, funcionarioId: func3.id });
        // checkouts 5 e 6: 2 avarias cada → cliente5 acumula 4 avarias → taxa de inspeção aplica no checkin8
        const checkout5 = await Checkout.create({ dataCheckout: fmt(plusDays(-35), "17:00"), quilometragemCheckout:  2000.00, nivelCombustivel: "Médio", condicaoPneus: "Bom",    condicaoPalhetas: "Boas",       limpoInternamente: true,  limpoExternamente: true,  taxaInspecao: 0, checkinId: checkin5.id, funcionarioId: func1.id });
        const checkout6 = await Checkout.create({ dataCheckout: fmt(plusDays(-15), "17:00"), quilometragemCheckout: 25800.00, nivelCombustivel: "Médio", condicaoPneus: "Bom",    condicaoPalhetas: "Boas",       limpoInternamente: true,  limpoExternamente: true,  taxaInspecao: 0, checkinId: checkin6.id, funcionarioId: func2.id });

        await checkout1.addAvarias([avaria1]);
        await checkout2.addAvarias([avaria2]);
        await checkout3.addAvarias([avaria3]);
        await checkout4.addAvarias([avaria4]);
        await checkout5.addAvarias([avaria1, avaria2]);
        await checkout6.addAvarias([avaria3, avaria4]);

        // ─── MULTAS DE AVARIA (geradas pelos checkouts históricos) ───────────────
        // Fórmula: com seguro → min(totalAvarias, franquia); sem seguro → totalAvarias
        // Todas Pagas pois são históricas e já foram quitadas
        // checkout1: avaria1=350, seguroOuro.franquia=1500 → min(350,1500)=350
        await Multa.create({ valor: 350.00, dataEmissao: fmt(plusDays(-26), "18:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente1.id, reservaId: reserva1.id });
        // checkout2: avaria2=900, seguroBasico.franquia=4000 → min(900,4000)=900
        await Multa.create({ valor: 900.00, dataEmissao: fmt(plusDays(-24), "17:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente2.id, reservaId: reserva2.id });
        // checkout3: avaria3=450, seguroPrata.franquia=2500 → min(450,2500)=450
        await Multa.create({ valor: 450.00, dataEmissao: fmt(plusDays(-20), "16:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente3.id, reservaId: reserva3.id });
        // checkout4: avaria4=180, seguroPlus.franquia=1000 → min(180,1000)=180
        await Multa.create({ valor: 180.00, dataEmissao: fmt(plusDays(-19), "15:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente4.id, reservaId: reserva4.id });
        // checkout5: avaria1(350)+avaria2(900)=1250, sem seguro → 1250
        await Multa.create({ valor: 1250.00, dataEmissao: fmt(plusDays(-35), "18:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente5.id, reservaId: reserva5.id });
        // checkout6: avaria3(450)+avaria4(180)=630, sem seguro → 630
        await Multa.create({ valor: 630.00, dataEmissao: fmt(plusDays(-15), "18:00"), descricao: "Avarias registradas no checkout não cobertas pelo seguro", status: "Paga", clienteId: cliente5.id, reservaId: reserva6.id });

        // ─── MULTAS ─────────────────────────────────────────────────────────────
        // cliente1 e cliente4 têm Pendente → bloqueiam check-in
        await Multa.create({ valor: 195.23, dataEmissao: "2024-03-20", descricao: "Excesso de velocidade na rodovia",     status: "Pendente", clienteId: cliente1.id });
        await Multa.create({ valor: 320.00, dataEmissao: "2024-02-11", descricao: "Avanço de sinal vermelho",             status: "Paga",     clienteId: cliente2.id });
        await Multa.create({ valor:  88.50, dataEmissao: "2023-12-05", descricao: "Estacionamento irregular",             status: "Paga",     clienteId: cliente3.id });
        await Multa.create({ valor: 540.90, dataEmissao: "2024-01-17", descricao: "Ultrapassagem em local proibido",      status: "Pendente", clienteId: cliente4.id });
        await Multa.create({ valor: 150.00, dataEmissao: "2024-06-10", descricao: "Velocidade excessiva em zona escolar", status: "Paga",     clienteId: cliente5.id });

    })();
}

export default sequelize;
