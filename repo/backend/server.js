require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const { 
  encryptFile, 
  decryptFile, 
  generateDownloadToken, 
  verifyDownloadToken, 
  logAudit, 
  JWT_SECRET 
} = require('./utils/security');

const { authenticateToken, authorizeRoles } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Directorio para almacenamiento cifrado de archivos
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración de la base de datos (PostgreSQL con Fallback a JSON local)
let pgPool = null;
let useMockDb = false;
const mockDbPath = path.join(__dirname, 'data', 'db_mock.json');

// Inicializar Mock DB si es necesario
if (!fs.existsSync(path.dirname(mockDbPath))) {
  fs.mkdirSync(path.dirname(mockDbPath), { recursive: true });
}
if (!fs.existsSync(mockDbPath)) {
  const initialMockData = {
    users: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        username: "admin",
        email: "admin@legal.com",
        password_hash: bcrypt.hashSync("admin123", 10),
        role: "administrador",
        status: "active"
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        username: "abogado1",
        email: "abogado@legal.com",
        password_hash: bcrypt.hashSync("abogado123", 10),
        role: "abogado",
        status: "active"
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        username: "cliente1",
        email: "cliente@legal.com",
        password_hash: bcrypt.hashSync("cliente123", 10),
        role: "cliente",
        status: "active"
      }
    ],
    categories: [
      { id: 1, name: "Leyes", count: 0 },
      { id: 2, name: "Sentencias", count: 0 },
      { id: 3, name: "Contratos", count: 0 },
      { id: 4, name: "Jurisprudencia", count: 0 },
      { id: 5, name: "Decretos", count: 0 }
    ],
    documents: [],
    tags: [
      { id: 1, name: "Tributario" },
      { id: 2, name: "Laboral" },
      { id: 3, name: "Penal" },
      { id: 4, name: "Civil" }
    ],
    document_tags: []
  };
  fs.writeFileSync(mockDbPath, JSON.stringify(initialMockData, null, 2));
}

// Intentar conexión a PostgreSQL si hay variables configuradas
if (process.env.DB_HOST) {
  pgPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  pgPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.warn('⚠️ No se pudo conectar a PostgreSQL. Se usará la Base de Datos Mock en JSON.');
      useMockDb = true;
    } else {
      console.log('✅ Conectado exitosamente a PostgreSQL:', res.rows[0].now);
    }
  });
} else {
  console.log('ℹ️ Variable DB_HOST no configurada. Usando base de datos mock local (JSON).');
  useMockDb = true;
}

// Helper para interactuar con la Base de Datos Mock
function getMockDb() {
  return JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
}

function saveMockDb(data) {
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2));
}

// Configuración de Multer para carga de archivos
// Usamos memoryStorage para recibir el buffer y encriptarlo directamente antes de guardar
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/pdf' || 
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     file.mimetype === 'application/msword';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo se aceptan archivos .pdf y .docx'));
    }
  }
});

// ==========================================
// RUTAS DE AUTENTICACIÓN (Para pruebas)
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  const roleValue = ['administrador', 'abogado', 'cliente'].includes(role) ? role : 'cliente';
  const hashedPassword = await bcrypt.hashSync(password, 10);
  const userId = crypto.randomUUID();

  if (useMockDb) {
    const db = getMockDb();
    if (db.users.find(u => u.email === email || u.username === username)) {
      return res.status(400).json({ error: 'El usuario o correo electrónico ya existe.' });
    }
    const newUser = { id: userId, username, email, password_hash: hashedPassword, role: roleValue, status: 'active' };
    db.users.push(newUser);
    saveMockDb(db);
    return res.status(201).json({ message: 'Usuario registrado exitosamente', user: { id: userId, username, email, role: roleValue } });
  } else {
    try {
      const result = await pgPool.query(
        'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role',
        [userId, username, email, hashedPassword, roleValue]
      );
      res.status(201).json({ message: 'Usuario registrado exitosamente', user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Error al registrar usuario en la base de datos.', details: err.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  let user = null;

  if (useMockDb) {
    const db = getMockDb();
    user = db.users.find(u => u.email === email && u.status === 'active');
  } else {
    try {
      const result = await pgPool.query('SELECT * FROM users WHERE email = $1 AND status = \'active\'', [email]);
      user = result.rows[0];
    } catch (err) {
      return res.status(500).json({ error: 'Error en base de datos.' });
    }
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logAudit({
      userId: null,
      role: null,
      action: 'LOGIN_ATTEMPT',
      documentId: null,
      status: 'FAILED',
      ip: req.ip,
      details: `Intento de login fallido para el correo: ${email}`
    });
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  logAudit({
    userId: user.id,
    role: user.role,
    action: 'LOGIN',
    documentId: null,
    status: 'SUCCESS',
    ip: req.ip,
    details: 'Login exitoso'
  });

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// ==========================================
// ENDPOINT: Carga de Documentos (POST)
// ==========================================
app.post('/api/documents/upload', authenticateToken, authorizeRoles(['administrador', 'abogado']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo o el formato no es válido.' });
    }

    const { title, description, category_id, tags } = req.body;
    if (!title || !category_id) {
      return res.status(400).json({ error: 'Título y categoría son campos obligatorios.' });
    }

    // 1. Cifrar el archivo en memoria usando AES-256
    const encryptedData = encryptFile(req.file.buffer);

    // 2. Generar nombre de archivo seguro (UUID) y guardar
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}.enc`;
    const storagePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(storagePath, encryptedData);

    // Calcular hash SHA-256 del archivo original para integridad
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const storageUrl = `/backend/uploads/${fileName}`;

    let savedDocument = null;

    if (useMockDb) {
      const db = getMockDb();
      
      // Validar categoría
      const catId = parseInt(category_id);
      const category = db.categories.find(c => c.id === catId);
      if (!category) {
        return res.status(400).json({ error: 'La categoría especificada no existe.' });
      }

      savedDocument = {
        id: fileId,
        title,
        description: description || '',
        storage_url: storageUrl,
        file_hash: fileHash,
        publication_date: new Date().toISOString().split('T')[0],
        category_id: catId,
        category_name: category.name,
        uploader_id: req.user.id,
        uploader_name: req.user.username,
        status: 'active',
        created_at: new Date().toISOString()
      };

      db.documents.push(savedDocument);

      // Manejar etiquetas (tags)
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : JSON.parse(tags);
        tagList.forEach(tagName => {
          let tag = db.tags.find(t => t.name.toLowerCase() === tagName.trim().toLowerCase());
          if (!tag) {
            tag = { id: db.tags.length + 1, name: tagName.trim() };
            db.tags.push(tag);
          }
          db.document_tags.push({ document_id: fileId, tag_id: tag.id });
        });
      }

      saveMockDb(db);
    } else {
      // Inserción en PostgreSQL
      const queryText = `
        INSERT INTO documents (id, title, description, storage_url, file_hash, category_id, uploader_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [fileId, title, description || '', storageUrl, fileHash, parseInt(category_id), req.user.id];
      const result = await pgPool.query(queryText, values);
      savedDocument = result.rows[0];

      // Manejar etiquetas
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : JSON.parse(tags);
        for (const tagName of tagList) {
          // Insertar tag si no existe
          const tagRes = await pgPool.query(
            'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
            [tagName.trim()]
          );
          const tagId = tagRes.rows[0].id;
          // Asociar en tabla intermedia
          await pgPool.query(
            'INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [fileId, tagId]
          );
        }
      }
    }

    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'UPLOAD',
      documentId: fileId,
      status: 'SUCCESS',
      ip: req.ip,
      details: `Documento "${title}" cargado y encriptado exitosamente.`
    });

    res.status(201).json({
      message: 'Documento subido y encriptado correctamente.',
      document: savedDocument
    });

  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: 'Error interno en el servidor al subir el archivo.', details: error.message });
  }
});

// ==========================================
// ENDPOINT: Obtener Lista de Documentos (GET)
// ==========================================
app.get('/api/documents', authenticateToken, async (req, res) => {
  const { category, search, startDate, endDate } = req.query;

  if (useMockDb) {
    const db = getMockDb();
    let filtered = db.documents.filter(doc => doc.status === 'active');

    // Filtro por categoría
    if (category) {
      filtered = filtered.filter(doc => doc.category_name.toLowerCase() === category.toLowerCase() || doc.category_id == category);
    }

    // Filtro por búsqueda de palabras clave (título, descripción)
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(s) || 
        doc.description.toLowerCase().includes(s)
      );
    }

    // Filtro por rango de fechas
    if (startDate) {
      filtered = filtered.filter(doc => doc.publication_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(doc => doc.publication_date <= endDate);
    }

    // Mapear etiquetas a cada documento
    const result = filtered.map(doc => {
      const docTagsIds = db.document_tags
        .filter(dt => dt.document_id === doc.id)
        .map(dt => dt.tag_id);
      
      const docTags = db.tags
        .filter(t => docTagsIds.includes(t.id))
        .map(t => t.name);

      return { ...doc, tags: docTags };
    });

    res.json(result);
  } else {
    // Consulta PostgreSQL
    try {
      let queryText = `
        SELECT d.*, c.name as category_name, u.username as uploader_name,
               ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) as tags
        FROM documents d
        JOIN categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.uploader_id = u.id
        LEFT JOIN document_tags dt ON d.id = dt.document_id
        LEFT JOIN tags t ON dt.tag_id = t.id
        WHERE d.status = 'active'
      `;
      const values = [];
      let valCount = 1;

      if (category) {
        queryText += ` AND (c.name ILIKE $${valCount} OR d.category_id = $${valCount + 1})`;
        values.push(category, isNaN(category) ? -1 : parseInt(category));
        valCount += 2;
      }

      if (search) {
        queryText += ` AND (d.title ILIKE $${valCount} OR d.description ILIKE $${valCount})`;
        values.push(`%${search}%`);
        valCount += 1;
      }

      if (startDate) {
        queryText += ` AND d.publication_date >= $${valCount}`;
        values.push(startDate);
        valCount += 1;
      }

      if (endDate) {
        queryText += ` AND d.publication_date <= $${valCount}`;
        values.push(endDate);
        valCount += 1;
      }

      queryText += ` GROUP BY d.id, c.name, u.username ORDER BY d.publication_date DESC`;

      const result = await pgPool.query(queryText, values);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al consultar documentos.', details: err.message });
    }
  }
});

// ==========================================
// ENDPOINT: Validar Permisos y Generar Token de Descarga (GET)
// ==========================================
app.get('/api/documents/download/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let document = null;

  if (useMockDb) {
    const db = getMockDb();
    document = db.documents.find(doc => doc.id === id && doc.status === 'active');
  } else {
    try {
      const result = await pgPool.query('SELECT * FROM documents WHERE id = $1 AND status = \'active\'', [id]);
      document = result.rows[0];
    } catch (err) {
      return res.status(500).json({ error: 'Error en la base de datos.' });
    }
  }

  if (!document) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  // VALIDACIÓN DE PERMISOS:
  // Administrador y Abogado pueden descargar todo.
  // Cliente solo puede descargar si tiene permisos o restricciones específicas (ejemplo base: clientes pueden descargar todo o solo de ciertas categorías).
  // Aquí validaremos que clientes no puedan descargar contratos a menos que sean administradores o abogados, como regla de negocio.
  if (req.user.role === 'cliente' && document.category_name === 'Contratos') {
    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'DENIED',
      documentId: id,
      status: 'FAILED',
      ip: req.ip,
      details: `Permisos insuficientes para descargar Contrato.`
    });
    return res.status(403).json({ error: 'Los clientes no tienen permisos para descargar archivos de la categoría "Contratos".' });
  }

  // Generar un token de descarga efímero y seguro (ofuscación)
  const downloadToken = generateDownloadToken(req.user.id, id);
  const secureUrl = `/api/files/secure-download?token=${downloadToken}`;

  logAudit({
    userId: req.user.id,
    role: req.user.role,
    action: 'DOWNLOAD_REQUEST',
    documentId: id,
    status: 'SUCCESS',
    ip: req.ip,
    details: 'Generado token de descarga segura.'
  });

  res.json({
    message: 'Descarga autorizada.',
    downloadUrl: secureUrl
  });
});

// ==========================================
// ENDPOINT: Descarga Segura y Desencriptación al Vuelo (GET)
// ==========================================
// Este endpoint NO requiere el encabezado Authorization Bearer convencional,
// porque la validación se realiza mediante el token de descarga efímero en la query.
app.get('/api/files/secure-download', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token de descarga requerido.' });
  }

  try {
    // 1. Verificar el token de descarga
    const decoded = verifyDownloadToken(token);
    const { userId, documentId } = decoded;

    // 2. Buscar metadatos del documento
    let document = null;
    if (useMockDb) {
      const db = getMockDb();
      document = db.documents.find(doc => doc.id === documentId && doc.status === 'active');
    } else {
      const result = await pgPool.query('SELECT * FROM documents WHERE id = $1 AND status = \'active\'', [documentId]);
      document = result.rows[0];
    }

    if (!document) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    // 3. Leer archivo cifrado del disco
    const fileName = path.basename(document.storage_url);
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico no existe en el almacenamiento.' });
    }

    const encryptedData = fs.readFileSync(filePath);

    // 4. Desencriptar al vuelo
    const decryptedData = decryptFile(encryptedData);

    // 5. Enviar archivo
    const originalExt = path.extname(document.title) ? '' : (document.storage_url.endsWith('.pdf') ? '.pdf' : '.docx');
    
    // Configurar cabeceras correctas de descarga
    res.setHeader('Content-Type', document.storage_url.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.title)}${originalExt}"`);
    res.send(decryptedData);

    // Auditar la descarga efectiva
    logAudit({
      userId,
      role: 'DECODED_FROM_TOKEN',
      action: 'DOWNLOAD',
      documentId,
      status: 'SUCCESS',
      ip: req.ip,
      details: 'Archivo desencriptado y descargado exitosamente.'
    });

  } catch (error) {
    console.error('Error en la descarga segura:', error);
    res.status(403).json({ error: 'El enlace de descarga es inválido o ha expirado.' });
  }
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor backend.', details: err.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de la Biblioteca Jurídica ejecutándose en http://localhost:${PORT}`);
});
