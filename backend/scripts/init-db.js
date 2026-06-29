require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDb() {
  console.log('🚀 Iniciando inicialización de la base de datos...');

  const connectionString = process.env.DATABASE_URL;
  const dbConfig = connectionString
    ? {
        connectionString,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };

  if (!connectionString && !process.env.DB_HOST) {
    console.error('❌ Error: No se encontraron variables de entorno para la base de datos (DATABASE_URL o DB_HOST).');
    console.error('Por favor, configura tu archivo backend/.env antes de continuar.');
    process.exit(1);
  }

  const client = new Client(dbConfig);

  try {
    console.log('🔄 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conexión establecida.');

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró el archivo de esquema en: ${schemaPath}`);
    }

    console.log(`📖 Leyendo archivo de esquema: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚡ Ejecutando sentencias SQL en la base de datos...');

    // Ejecutar cada sentencia por separado para hacer la inicialización idempotente
    // Dividir por ';' y limpiar entradas; usar guardas para evitar undefined
    const statements = sql
      .split(';')
      .map(s => (typeof s === 'string' ? s.trim() : ''))
      .filter(s => s.length);

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        // Ignorar errores de objetos que ya existen para permitir reruns
        if (/already exists|duplicate key|relation .* already exists/i.test(msg)) {
          console.warn('⚠️ Advertencia (ignorando):', msg);
        } else {
          throw err;
        }
      }
    }
    
    console.log('🎉 ¡Base de datos inicializada con éxito!');
  } catch (error) {
    console.error('❌ Error durante la inicialización de la base de datos:');
    console.error(error.message);
    if (error.detail) console.error(`Detalle: ${error.detail}`);
    if (error.hint) console.error(`Sugerencia: ${error.hint}`);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

initDb();
