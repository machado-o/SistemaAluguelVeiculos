//Henrique
import { Model, DataTypes } from 'sequelize';

class Reserva extends Model {
  static init(sequelize) {
    super.init({
      dataRetirada: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: { msg: "A data/hora de retirada deve ser preenchida!" },
          isDate: { msg: "Data de retirada inválida!" }
        }
      },
      dataDevolucao: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: { msg: "A data/hora de devolução deve ser preenchida!" },
          isDate: { msg: "Data de devolução inválida!" },
          isAfterRetirada(value) {
            if (new Date(value) <= new Date(this.dataRetirada)) {
              throw new Error('A data de devolução deve ser posterior à data de retirada!');
            }
          }
        }
      },
      valorDiaria: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          notNull: { msg: "O valor da diária deve ser preenchido!" },
          isDecimal: { msg: "O valor da diária deve ser um número decimal válido!" },
          min: { args: [0], msg: "O valor da diária não pode ser negativo!" }
        }
      },
      quantidadeDias: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: "A quantidade de dias deve ser preenchida!" },
          isInt: { msg: "A quantidade de dias deve ser um número inteiro!" },
          min: { args: [1], msg: "A reserva deve ter duração mínima de 1 dia!" },
          max: { args: [365], msg: "A reserva não pode ter duração superior a 365 dias!" }
        }
      },
      valorSeguro: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        validate: {
          isDecimal: { msg: "O valor do seguro deve ser um número decimal válido!" },
          min: { args: [0], msg: "O valor do seguro não pode ser negativo!" }
        }
      },
      valorFinal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          notNull: { msg: "O valor final estimado deve ser preenchido!" },
          isDecimal: { msg: "O valor final estimado deve ser um número decimal válido!" },
          min: { args: [0], msg: "O valor final estimado não pode ser negativo!" }
        }
      },
      taxaInspecao: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          isDecimal: { msg: "A taxa de inspeção deve ser um número decimal válido!" },
          min: { args: [0], msg: "A taxa de inspeção não pode ser negativa!" }
        }
      },
      status: {
        type: DataTypes.ENUM('Pendente', 'Confirmada', 'Cancelada', 'Concluída'),
        allowNull: false,
        defaultValue: 'Pendente',
        validate: {
          notNull: { msg: "O status da reserva deve ser preenchido!" },
          isIn: { args: [['Pendente', 'Confirmada', 'Cancelada', 'Concluída']], msg: "Status inválido!" }
        }
      }
    }, { sequelize, modelName: 'reserva', tableName: 'reservas' });
  }
  static associate(models) {
    this.belongsTo(models.cliente, {
      as: 'cliente',
      foreignKey: {
        name: 'clienteId',
        allowNull: false,
        validate: {
          notNull: { msg: "A reserva deve estar associada a um cliente!" }
        }
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    this.belongsTo(models.categoriaVeiculo, {
      as: 'categoriaVeiculo',
      foreignKey: {
        name: 'categoriaVeiculoId',
        allowNull: false,
        validate: {
          notNull: { msg: "A reserva deve estar associada a uma categoria de veículo!" }
        }
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    this.belongsTo(models.funcionario, {
      as: 'funcionario',
      foreignKey: {
        name: 'funcionarioId',
        allowNull: false,
        validate: {
          notNull: { msg: "A reserva deve estar associada a um funcionário!" }
        }
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    this.belongsTo(models.seguro, {
      as: 'seguro',
      foreignKey: {
        name: 'seguroId',
        allowNull: true,
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    this.belongsTo(models.agencia, {
      as: 'agenciaRetirada',
      foreignKey: {
        name: 'agenciaRetiradaId',
        allowNull: false,
        validate: {
          notNull: { msg: "A reserva deve estar associada a uma agência de retirada!" }
        }
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    this.belongsTo(models.agencia, {
      as: 'agenciaDevolucao',
      foreignKey: {
        name: 'agenciaDevolucaoId',
        allowNull: false,
        validate: {
          notNull: { msg: "A reserva deve estar associada a uma agência de devolução!" }
        }
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    this.hasOne(models.checkin, {
      as: 'checkin',
      foreignKey: 'reservaId',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    this.hasMany(models.multa, {
      as: 'multas',
      foreignKey: 'reservaId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
}

export { Reserva };