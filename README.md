# TrinityDev

Sistema de Aluguel de Veiculos

## Tecnologias

- Node.js + Express
- Sequelize ORM
- Banco relacional (SQLite em teste local e Postgres em desenvolvimento/produção)
- Docker + Docker Compose

## Grupo: Henrique, Julia e Lorrayne | Tema: Aluguel de Veículos

### Domínio do problema: Sistema de gestão de aluguel de veículos voltado para os funcionários da empresa.

### Processos de negócio:

1. Reserva
2. Check-in
3. Check-out

### Cadastros:

1. Funcionário
2. Cliente
3. Agência
4. Categoria de Veículo
5. Veículo
6. Seguro

### Regras de Negócio (2 p/ cada processo):

1. Reserva: O desconto automático sobre o valor total é aplicado quando a quantidade de dias atinge o limite configurado pela agência — mas somente se a agência já possui ao menos 2 reservas concluídas em seu histórico, comprovando sua capacidade operacional.
2. Reserva: O sistema bloqueia a criação de reservas para clientes que já possuem outra reserva ativa (não cancelada e não concluída) cujo período se sobreponha ao solicitado.
3. Check-in: Caso não haja veículos disponíveis na categoria solicitada, o sistema busca automaticamente um veículo de categoria superior e realiza o upgrade gratuitamente para o cliente.
4. Check-in: O sistema bloqueia o check-in de clientes que possuam multas com status "Pendente" em seu histórico.
5. Check-out: A quilometragem de devolução deve ser maior ou igual à registrada no check-in e não pode ser inferior à maior quilometragem já registrada no histórico de checkouts daquele veículo. Após o checkout, o odômetro do veículo é atualizado.
6. Reserva: Quando um cliente acumula mais de 3 avarias em locações anteriores (somando todos os seus checkouts concluídos), uma taxa de inspeção de R$ 150,00 é cobrada automaticamente na próxima reserva, adicionada ao valor final. O check-out que ultrapassa o limite exibe o indicador de R$ 150,00 para sinalizar que a cobrança ocorrerá na reserva seguinte.

### Relatórios:

1. Reservas realizadas por funcionário em um período. Filtros: Funcionário e Data.
   Totalização: Quantidade e valor de reservas realizadas por um funcionário.
2. Reservas por categoria de veículo em um período. Filtros: Categoria de Veículo e Data.
   Totalização: Quantidade e valor de reservas de uma categoria de veículo.
3. Check-ins realizados por agência em um período. Filtros: Agência e Data.
   Totalização: Quantidade de check-ins de uma agência.
4. Check-ins agrupados por veículo em um período. Filtros: Veículo e Data.
   Totalização: Quantidade de check-ins de um veículo.
5. Check-outs com avarias registradas agrupadas por veículo em um período informado. Filtros: Veículo e Data.
   Totalização: Quantidade e valor de avarias de um veículo.
6. Check-outs com multas aplicadas a clientes em um período. Filtros: Cliente e Data.
   Totalização: Quantidade e valor de multas de um cliente.

# Visão Geral

É proposto o desenvolvimento do Sistema de Aluguel de Veículos (SAV), voltado exclusivamente para os funcionários de uma locadora de veículos. O sistema tem como objetivo informatizar e centralizar os processos de reserva, check-in e check-out, garantindo maior controle operacional, rastreabilidade das locações e cumprimento das regras de negócio da empresa.

Deverão ser gerados relatórios relacionados aos cadastros básicos e às operações de reserva, check-in e check-out.

O sistema deverá aplicar automaticamente descontos para reservas com diárias acima do limite definido, e calcular multas para avarias não cobertas por seguro.

## Abrangência e sistemas relacionados:

### O SAV é um sistema independente e totalmente auto-contido. Suas principais funcionalidades contemplam:

- Gestão de cadastros: funcionários, clientes, agências, categorias de veículos, veículos e seguros.
- Reservas: criação, consulta e cancelamento de reservas de veículos.
- Check-in: registro de retirada de veículos por clientes.
- Check-out: registro de devolução de veículos por clientes e do estado do veículo.
- Relatórios: emissão de relatórios gerenciais conforme necessidade da empresa.

### Funcionalidades que não serão implementadas nesta versão:

- Integração com sistemas externos de pagamento (cartão, PIX, etc.).
- Acesso direto pelo cliente via portal web ou aplicativo mobile.
- Gestão de frotas para manutenção preventiva e corretiva de veículos.

## Descrição do cliente:

Mova-se Locadora

Endereço: Rua Pedrinho Salvador, 777

Telefone: (27) 4002-8922

Proprietário: Yudi Tamashiro

## Descrição dos usuários:

Os usuários do SAV são exclusivamente os funcionários da empresa. A seguir estão descritos os perfis de usuário previstos.

### Atendente

Usuário operacional responsável pelo atendimento direto ao cliente. Ele realiza as operações de reserva, check-in e check-out, além de poder consultar e cadastrar clientes.

### Gerente

Este é o administrador do sistema. Este usuário é o responsável por cadastrar novos Funcionários no sistema assim como também realizar todas as funcionalidades do sistema.

---

# Como Rodar

## Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados

## Com Docker (recomendado)

```bash
docker compose up --build -d
```

Isso sobe três serviços:

| Serviço   | Endereço             |
| ---------- | --------------------- |
| API        | http://localhost:3000 |
| PostgreSQL | localhost:5432        |
| pgAdmin    | http://localhost:5050 |

Para parar:

```bash
docker compose down
```

## Sem Docker (desenvolvimento local)

Requer Node.js instalado. Primeiro, configure o banco em `src/config/database-config.js` (há uma config SQLite comentada para uso local).

```bash
npm install
npm run dev
```

O servidor sobe na porta `3333` com hot-reload via nodemon.

> **Atenção:** o banco é recriado e reseedado a cada reinicialização do servidor (`sync({ force: true })`).

## pgAdmin

Acesse `http://localhost:5050` e faça login com `admin@admin.com` / `admin`.

Para conectar ao banco, registre um novo servidor com:

- **Host:** `db`
- **Port:** `5432`
- **Database:** `sav_trinitydev`
- **Username:** `admin`
- **Password:** `admin123`

---

# Documentação da API

Base URL: `http://localhost:3000`

Todos os endpoints seguem o padrão REST. Respostas são em JSON. Erros retornam `{ "message": "descrição do erro" }`.

---

## Agências — `/agencias`

| Método | Rota          | Descrição              |
| ------- | ------------- | ------------------------ |
| GET     | /agencias     | Lista todas as agências |
| GET     | /agencias/:id | Busca agência por ID    |
| POST    | /agencias     | Cria agência            |
| PUT     | /agencias/:id | Atualiza agência        |
| DELETE  | /agencias/:id | Remove agência          |

**Campos (POST/PUT):**

```json
{
  "nome": "Agência Centro",
  "cnpj": "12.345.678/0001-90",
  "endereco": "Rua Exemplo, 100",
  "telefone": "(27) 3333-4444",
  "status": "Ativa",
  "limiteDiasDesconto": 7,
  "percentualDesconto": 10.00
}
```

`status`: `"Ativa"` | `"Inativa"`

---

## Funcionários — `/funcionarios`

| Método | Rota              | Descrição                  |
| ------- | ----------------- | ---------------------------- |
| GET     | /funcionarios     | Lista todos os funcionários |
| GET     | /funcionarios/:id | Busca funcionário por ID    |
| POST    | /funcionarios     | Cria funcionário            |
| PUT     | /funcionarios/:id | Atualiza funcionário        |
| DELETE  | /funcionarios/:id | Remove funcionário          |

**Campos (POST/PUT):**

```json
{
  "nome": "Carlos Silva",
  "cpf": "123.456.789-00",
  "cargo": "Atendente",
  "dataNascimento": "1995-06-20",
  "telefone": "(27) 99999-1111",
  "email": "carlos@example.com",
  "senha": "Senha@1234",
  "agenciaId": 1
}
```

`cargo`: `"Gerente"` | `"Atendente"` — a senha é armazenada com hash bcrypt e **nunca retornada** nas consultas.

---

## Clientes — `/clientes`

| Método | Rota          | Descrição             |
| ------- | ------------- | ----------------------- |
| GET     | /clientes     | Lista todos os clientes |
| GET     | /clientes/:id | Busca cliente por ID    |
| POST    | /clientes     | Cria cliente            |
| PUT     | /clientes/:id | Atualiza cliente        |
| DELETE  | /clientes/:id | Remove cliente          |

**Campos (POST/PUT):**

```json
{
  "nome": "João Souza",
  "cpf": "111.222.333-44",
  "dataNascimento": "1990-03-15",
  "telefone": "(28) 98888-7777",
  "email": "joao@email.com",
  "cnh": "12345678901",
  "categoriaCnh": "B",
  "validadeCnh": "2030-01-01",
  "endereco": "Av. Principal, 500"
}
```

`categoriaCnh`: `"A"` | `"B"` | `"AB"` | `"C"` | `"D"` | `"E"` | `"AC"` | `"AD"` | `"AE"`

---

## Categorias de Veículo — `/categoriasdeveiculos`

| Método | Rota                      | Descrição               |
| ------- | ------------------------- | ------------------------- |
| GET     | /categoriasdeveiculos     | Lista todas as categorias |
| GET     | /categoriasdeveiculos/:id | Busca categoria por ID    |
| POST    | /categoriasdeveiculos     | Cria categoria            |
| PUT     | /categoriasdeveiculos/:id | Atualiza categoria        |
| DELETE  | /categoriasdeveiculos/:id | Remove categoria          |

**Campos (POST/PUT):**

```json
{
  "nome": "SUV Premium",
  "descricao": "Veículos SUV de alto padrão",
  "valorDiaria": 350.00,
  "tipoCarroceria": "SUV",
  "propulsao": "Combustão",
  "cambio": "Automático",
  "arCondicionado": true,
  "capacidade": 5
}
```

`tipoCarroceria`: `"Sedan"` | `"Hatch"` | `"SUV"` | `"Picape"` — `propulsao`: `"Elétrico"` | `"Híbrido"` | `"Combustão"` — `cambio`: `"Automático"` | `"Manual"`

---

## Veículos — `/veiculos`

| Método | Rota          | Descrição              |
| ------- | ------------- | ------------------------ |
| GET     | /veiculos     | Lista todos os veículos |
| GET     | /veiculos/:id | Busca veículo por ID    |
| POST    | /veiculos     | Cria veículo            |
| PUT     | /veiculos/:id | Atualiza veículo        |
| DELETE  | /veiculos/:id | Remove veículo          |

**Campos (POST/PUT):**

```json
{
  "placa": "ABC1D23",
  "chassi": "9BWZZZ37ZVT000001",
  "status": "Disponível",
  "marca": "Toyota",
  "modelo": "Corolla",
  "cor": "Prata",
  "anoFabricacao": "2023",
  "quilometragem": 15000.00,
  "categoriaVeiculoId": 1,
  "agenciaId": 1
}
```

`status`: `"Disponível"` | `"Reservado"` | `"Manutenção"` — `cor`: `"Branco"` | `"Preto"` | `"Cinza"` | `"Prata"` | `"Outra"`

---

## Seguros — `/seguros`

| Método | Rota         | Descrição            |
| ------- | ------------ | ---------------------- |
| GET     | /seguros     | Lista todos os seguros |
| GET     | /seguros/:id | Busca seguro por ID    |
| POST    | /seguros     | Cria seguro            |
| PUT     | /seguros/:id | Atualiza seguro        |
| DELETE  | /seguros/:id | Remove seguro          |

**Campos (POST/PUT):**

```json
{
  "nome": "Plano Ouro",
  "empresaSeguradora": "Porto Seguro",
  "descricao": "Cobertura completa",
  "valorDiariaAdicional": 50.00,
  "franquia": 1500.00
}
```

---

## Coberturas — `/coberturas`

| Método | Rota            | Descrição               |
| ------- | --------------- | ------------------------- |
| GET     | /coberturas     | Lista todas as coberturas |
| GET     | /coberturas/:id | Busca cobertura por ID    |
| POST    | /coberturas     | Cria cobertura            |
| PUT     | /coberturas/:id | Atualiza cobertura        |
| DELETE  | /coberturas/:id | Remove cobertura          |

**Campos (POST/PUT):**

```json
{
  "nome": "Colisão Total",
  "descricao": "Cobertura para colisões totais",
  "valorIndenizacaoMax": 80000.00
}
```

---

## Avarias — `/avarias`

| Método | Rota         | Descrição            |
| ------- | ------------ | ---------------------- |
| GET     | /avarias     | Lista todas as avarias |
| GET     | /avarias/:id | Busca avaria por ID    |
| POST    | /avarias     | Cria avaria            |
| PUT     | /avarias/:id | Atualiza avaria        |
| DELETE  | /avarias/:id | Remove avaria          |

**Campos (POST/PUT):**

```json
{
  "nome": "Arranhão na porta",
  "valor": 350.00
}
```

---

## Multas — `/multas`

| Método | Rota        | Descrição           |
| ------- | ----------- | --------------------- |
| GET     | /multas     | Lista todas as multas |
| GET     | /multas/:id | Busca multa por ID    |
| POST    | /multas     | Cria multa            |
| PUT     | /multas/:id | Atualiza multa        |
| DELETE  | /multas/:id | Remove multa          |

**Campos (POST/PUT):**

```json
{
  "valor": 195.23,
  "dataEmissao": "2024-03-20T00:00:00",
  "descricao": "Excesso de velocidade",
  "status": "Pendente",
  "clienteId": 1,
  "reservaId": 1
}
```

`status`: `"Pendente"` | `"Paga"` — `reservaId` é opcional.

> Multas de avaria são **geradas automaticamente** pelo sistema no momento do check-out quando avarias são informadas. O valor é calculado como `min(soma das avarias, franquia do seguro)` quando há seguro, ou o valor total das avarias caso não haja. Multas manuais podem ser criadas para outros fins (ex.: infrações de trânsito).

---

## Reservas — `/reservas`

| Método | Rota          | Descrição             |
| ------- | ------------- | ----------------------- |
| GET     | /reservas     | Lista todas as reservas |
| GET     | /reservas/:id | Busca reserva por ID    |
| POST    | /reservas     | Cria reserva            |
| PUT     | /reservas/:id | Atualiza reserva        |
| DELETE  | /reservas/:id | Remove reserva          |

**Campos (POST):**

```json
{
  "dataRetirada": "2026-05-10T08:00:00",
  "dataDevolucao": "2026-05-15T18:00:00",
  "clienteId": 1,
  "categoriaVeiculoId": 1,
  "funcionarioId": 1,
  "seguroId": 1,
  "agenciaRetiradaId": 1,
  "agenciaDevolucaoId": 1
}
```

> `valorDiaria`, `quantidadeDias`, `valorSeguro`, `taxaInspecao` e `valorFinal` são **calculados automaticamente** pelo sistema. Desconto automático é aplicado se `quantidadeDias >= limiteDiasDesconto` da agência de retirada **e** a agência possui ao menos 2 reservas concluídas em seu histórico. Se o cliente acumular mais de 3 avarias em locações anteriores, `taxaInspecao = 150.00` é adicionada ao `valorFinal`.

`status` (somente leitura): `"Pendente"` → `"Confirmada"` (após check-in) → `"Concluída"` (após check-out) | `"Cancelada"`

---

## Check-ins — `/checkins`

| Método | Rota          | Descrição              |
| ------- | ------------- | ------------------------ |
| GET     | /checkins     | Lista todos os check-ins |
| GET     | /checkins/:id | Busca check-in por ID    |
| POST    | /checkins     | Cria check-in            |
| PUT     | /checkins/:id | Atualiza check-in        |
| DELETE  | /checkins/:id | Remove check-in          |

**Campos (POST):**

```json
{
  "dataCheckin": "2026-05-10T08:10:00",
  "cnhCondutor": "12345678901",
  "cnhValidade": "2030-01-01",
  "quilometragemCheckin": 25000.00,
  "reservaId": 1,
  "veiculoId": 2,
  "funcionarioId": 1
}
```

> A `cnhCondutor` deve ser idêntica à CNH cadastrada para o cliente da reserva. O sistema bloqueia clientes com multas pendentes. Se não houver veículo disponível na categoria solicitada, um upgrade de categoria é aplicado automaticamente. Após o check-in, o veículo vai para `"Reservado"` e a reserva para `"Confirmada"`.

---

## Check-outs — `/checkouts`

| Método | Rota           | Descrição               |
| ------- | -------------- | ------------------------- |
| GET     | /checkouts     | Lista todos os check-outs |
| GET     | /checkouts/:id | Busca check-out por ID    |
| POST    | /checkouts     | Cria check-out            |
| PUT     | /checkouts/:id | Atualiza check-out        |
| DELETE  | /checkouts/:id | Remove check-out          |

**Campos (POST):**

```json
{
  "dataCheckout": "2026-05-15T17:30:00",
  "quilometragemCheckout": 25400.00,
  "nivelCombustivel": "Médio",
  "condicaoPneus": "Bom",
  "condicaoPalhetas": "Boas",
  "limpoInternamente": false,
  "limpoExternamente": true,
  "observacoes": "Pequeno arranhão na porta traseira",
  "checkinId": 1,
  "funcionarioId": 2,
  "avariaIds": [1, 2]
}
```

`nivelCombustivel`: `"Alto"` | `"Médio"` | `"Baixo"` | `"Vazio"` — `condicaoPneus`: `"Bom"` | `"Regular"` | `"Ruim"` | `"Furado"` — `condicaoPalhetas`: `"Boas"` | `"Ressecadas"` | `"Quebradas"` | `"Ausentes"` — `avariaIds` é opcional.

> A quilometragem de devolução deve ser maior ou igual à registrada no check-in e não pode ser inferior à maior quilometragem já registrada no histórico daquele veículo. Após o check-out, o odômetro é atualizado, o status volta para `"Disponível"` e a reserva vai para `"Concluída"`. O campo `taxaInspecao` no retorno indica se o cliente ultrapassou 3 avarias totais (incluindo as deste checkout) — valor R$ 150,00 significa que a **próxima reserva** desse cliente será cobrada. Se avarias forem informadas, uma multa é gerada automaticamente com valor = `min(totalAvarias, franquia do seguro)` ou `totalAvarias` caso não haja seguro.

---

## Relatórios — `/relatorios`

Todos os endpoints de relatório são somente leitura (GET). Requerem os parâmetros `inicio` e `termino` (datas no formato `YYYY-MM-DD`). Suportam paginação via `pagina` e `itensPorPagina` (padrão: 20, máximo: 100).

**Formato de resposta:**
```json
{
  "dados": [...],
  "paginacao": { "pagina": 1, "itensPorPagina": 20, "total": 50, "totalPaginas": 3 }
}
```

| Método | Rota                                          | Descrição                                         |
| ------- | --------------------------------------------- | --------------------------------------------------- |
| GET     | /relatorios/reservas/por-funcionario          | Reservas agrupadas por funcionário no período      |
| GET     | /relatorios/reservas/por-categoria            | Reservas agrupadas por categoria de veículo        |
| GET     | /relatorios/checkins/por-agencia              | Check-ins agrupados por agência no período         |
| GET     | /relatorios/checkins/por-veiculo              | Check-ins agrupados por veículo no período         |
| GET     | /relatorios/checkouts/avarias-por-veiculo     | Check-outs com avarias agrupados por veículo       |
| GET     | /relatorios/checkouts/multas-por-cliente      | Check-outs com multas agrupados por cliente        |

**Parâmetros de query:**

| Endpoint                          | Obrigatórios        | Opcional           |
| --------------------------------- | ------------------- | ------------------- |
| reservas/por-funcionario          | `inicio`, `termino` | `funcionarioId`    |
| reservas/por-categoria            | `inicio`, `termino` | `categoriaVeiculoId` |
| checkins/por-agencia              | `inicio`, `termino` | `agenciaId`        |
| checkins/por-veiculo              | `inicio`, `termino` | `veiculoId`        |
| checkouts/avarias-por-veiculo     | `inicio`, `termino` | `veiculoId`        |
| checkouts/multas-por-cliente      | `inicio`, `termino` | `clienteId`        |

**Exemplo:**
```
GET /relatorios/reservas/por-funcionario?inicio=2026-04-01&termino=2026-05-16&funcionarioId=1&pagina=1&itensPorPagina=10
```
