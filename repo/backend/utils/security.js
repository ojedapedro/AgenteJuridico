const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Obtener claves de entorno o usar valores por defecto para desarrollo
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.scryptSync('default_development_key_32_bytes_long', 'salt', 32);

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_legal_library';
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'download_token_secret_key_987654';

/**
 * Encripta un búfer de datos utilizando AES-256-CBC.
 * El IV generado aleatoriamente se concatena al inicio del archivo cifrado.
 * @param {Buffer} buffer - Datos originales
 * @returns {Buffer} - Datos cifrados con IV prepuesto
 */
function encryptFile(buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Retornar iv + datos cifrados
  return Buffer.concat([iv, encrypted]);
}

/**
 * Desencripta un búfer de datos cifrado previamente con encryptFile.
 * @param {Buffer} encryptedBuffer - Datos cifrados (incluye IV al inicio)
 * @returns {Buffer} - Datos originales desencriptados
 */
function decryptFile(encryptedBuffer) {
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const encryptedData = encryptedBuffer.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Genera un token de descarga seguro y efímero (vence en 5 minutos).
 * Ofusca la ruta directa del archivo.
 * @param {string} userId - ID del usuario que solicita
 * @param {string} documentId - ID del documento solicitado
 * @returns {string} - Token JWT efímero
 */
function generateDownloadToken(userId, documentId) {
  return jwt.sign(
    { userId, documentId },
    DOWNLOAD_SECRET,
    { expiresIn: '5m' } // 5 minutos de validez
  );
}

/**
 * Verifica un token de descarga efímero.
 * @param {string} token - Token de descarga
 * @returns {object} - Payload decodificado ({ userId, documentId })
 */
function verifyDownloadToken(token) {
  try {
    return jwt.verify(token, DOWNLOAD_SECRET);
  } catch (error) {
    throw new Error('Token de descarga inválido o expirado.');
  }
}

/**
 * Registra eventos en un log de auditoría local seguro.
 * @param {object} param0 - Datos de la auditoría
 * @param {string} param0.userId - ID del usuario
 * @param {string} param0.role - Rol del usuario
 * @param {string} param0.action - Acción (UPLOAD, DOWNLOAD, VIEW, DENIED)
 * @param {string} param0.documentId - ID del documento (si aplica)
 * @param {string} param0.status - Estado (SUCCESS, FAILED)
 * @param {string} param0.ip - Dirección IP de origen
 * @param {string} param0.details - Detalles adicionales
 */
function logAudit({ userId, role, action, documentId, status, ip, details = '' }) {
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'audit.log');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] IP: ${ip} | USER: ${userId || 'GUEST'} (${role || 'N/A'}) | ACTION: ${action} | DOC_ID: ${documentId || 'N/A'} | STATUS: ${status} | DETAILS: ${details}\n`;

  // Escribir en archivo local de logs
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Error al guardar log de auditoría:', err);
    }
  });

  // Imprimir en consola de desarrollo
  console.log(`[AUDIT] ${action} - User: ${userId || 'GUEST'} - Doc: ${documentId || 'N/A'} - Status: ${status}`);
}

module.exports = {
  encryptFile,
  decryptFile,
  generateDownloadToken,
  verifyDownloadToken,
  logAudit,
  JWT_SECRET
};
