/*
// Configuração do banco de dados no ambiente de teste
export const databaseConfig = {
  dialect: 'sqlite',
  storage: 'database.sqlite',
  define: {
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
};
*/

/*
// Configuração do banco de dados no ambiente de desenvolvimento
export const databaseConfig = {
  dialect: 'postgres',
  host: 'db',
  username: 'admin',
  password: 'admin123',
  database: 'sav_trinitydev',
  define: {
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
};
*/

export const databaseConfig = {
  dialect: 'postgres',
  host:     process.env.DB_HOST || 'dpg-d91e6skm0tmc738g0s5g-a.oregon-postgres.render.com',
  username: process.env.DB_USER || 'sav_trinitydev_db_user',
  password: process.env.DB_PASS || 'eNLqmeYPeDh3g1k3jO7w7ilmzL6yM36m',
  database: process.env.DB_NAME || 'sav_trinitydev_db_vuth',
  define: {
    timestamps: true,
    freezeTableName: true,
    underscored: true
  },
  ...(!process.env.DB_HOST && { dialectOptions: { ssl: { rejectUnauthorized: false } } })
};


/*
Passo a passo pgadmin

Login:
  email: admin@admin.com
  password: admin

Add new server
  General:
    Name: Banco Trinity
  Connection:
    Host: db
    Port: 5432
    Maintenance database: sav_trinitydev
    Username: admin
    Password: admin123
*/