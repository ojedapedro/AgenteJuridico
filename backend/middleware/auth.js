const jwt = require('jsonwebtoken');
const { JWT_SECRET, logAudit } = require('../utils/security');

/**
 * Middleware para validar el token JWT en las solicitudes protegidas.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    logAudit({
      userId: null,
      role: null,
      action: 'UNAUTHORIZED_ACCESS',
      documentId: null,
      status: 'FAILED',
      ip: req.ip || req.connection.remoteAddress,
      details: 'Intento de acceso sin token JWT'
    });
    return res.status(401).json({ error: 'Acceso denegado. Token no suministrado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logAudit({
        userId: null,
        role: null,
        action: 'INVALID_TOKEN_ACCESS',
        documentId: null,
        status: 'FAILED',
        ip: req.ip || req.connection.remoteAddress,
        details: `Token inválido o expirado. Error: ${err.message}`
      });
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    
    // Asignar el usuario decodificado al request (contiene id, username, role)
    req.user = user;
    next();
  });
}

/**
 * Middleware para autorizar roles específicos de usuario.
 * @param {Array<string>} rolesPermitidos - Lista de roles autorizados (e.g. ['administrador', 'abogado'])
 */
function authorizeRoles(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ error: 'Error de autenticación interna en el servidor.' });
    }

    if (!rolesPermitidos.includes(req.user.role)) {
      logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'FORBIDDEN_ACCESS',
        documentId: null,
        status: 'FAILED',
        ip: req.ip || req.connection.remoteAddress,
        details: `Usuario no autorizado para esta acción. Roles requeridos: ${rolesPermitidos.join(', ')}`
      });
      return res.status(403).json({ 
        error: `Acceso restringido. Requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
