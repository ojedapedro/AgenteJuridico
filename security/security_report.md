# Reporte de Ciberseguridad y Cumplimiento Normativo (RGPD)
## Biblioteca de Documentos Jurídicos - LEGIS-DOCS

Este documento detalla el análisis de seguridad aplicado al flujo de carga, almacenamiento y descarga de documentos jurídicos en la plataforma, y proporciona la lista de verificación (checklist) de cumplimiento con el **Reglamento General de Protección de Datos (RGPD)** de la Unión Europea y estándares equivalentes.

---

## 1. Análisis de Seguridad del Flujo de Datos

### A. Carga de Archivos
* **Riesgo:** Carga de malware, secuestros de servidor mediante archivos ejecutables disfrazados, o intercepción de archivos en tránsito.
* **Mitigación Implementada:**
  - Validación estricta de extensiones (`.pdf`, `.docx`) y de los correspondientes tipos MIME en el servidor mediante el middleware `Multer`.
  - Límite de tamaño máximo del archivo (10 MB) para prevenir denegación de servicio (DoS) por agotamiento de disco.
  - Recepción directa en memoria (búfer de Node.js) sin guardar archivos temporales sin cifrar en el disco del servidor.
* **Recomendación de Producción:** Implementar un escáner de virus/malware (como *ClamAV*) en el servidor de carga antes de almacenar el archivo.

### B. Almacenamiento (Cifrado en Reposo - AES-256)
* **Riesgo:** Acceso físico o lógico no autorizado al disco del servidor que exponga los documentos confidenciales de los clientes.
* **Mitigación Implementada:**
  - Cifrado simétrico de grado militar **AES-256-CBC**.
  - Generación de un Vector de Inicialización (IV) aleatorio de 16 bytes por cada archivo individual, concatenado al principio del archivo final. Esto garantiza que dos archivos idénticos tengan contenidos cifrados completamente distintos.
  - El nombre físico del archivo se genera mediante un identificador único aleatorio (UUID v4), ocultando el título original del documento en el sistema de archivos del servidor.
* **Código de Encriptación de Referencia (ver `backend/utils/security.js`):**
  ```javascript
  const crypto = require('crypto');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const finalFile = Buffer.concat([iv, encrypted]);
  ```

### C. Descarga de Archivos (Ofuscación y Control de Accesos)
* **Riesgo:** Exposición directa del sistema de archivos mediante URLs estáticas (ej. `/uploads/contrato.pdf`), permitiendo descargas no autorizadas mediante raspado (scraping) o ataques de escalada de directorios (Directory Traversal).
* **Mitigación Implementada:**
  - Las rutas de los archivos están completamente **ofuscadas**. Los clientes nunca conocen el nombre ni la ubicación del archivo en disco.
  - La descarga directa del directorio `/uploads/` está bloqueada por el servidor Express (no es público).
  - Flujo de descarga en dos pasos protegido:
    1. El usuario solicita la descarga a `/api/documents/download/:id` enviando su JWT. El sistema valida sus permisos y rol (ej. bloquea descargas de contratos a usuarios con rol `cliente`).
    2. Si se autoriza, el servidor genera un **token de descarga efímero y firmado** (válido por 5 minutos) y devuelve una URL temporal como `/api/files/secure-download?token=TOKEN_EFIMERO`.
    3. El navegador consume esa URL. El backend valida la firma del token, extrae los identificadores, lee el archivo cifrado de disco, lo descifra **al vuelo (en memoria)** y lo transmite (stream) al cliente sin escribir el archivo temporal legible en disco.

---

## 2. Registro de Auditoría (Audit Logs)

Para cumplir con el principio de **Responsabilidad Proactiva (Accountability)** del RGPD, se registra en un log de auditoría inmutable cada acción relacionada con la manipulación de documentos.

* **Estructura del Registro:**
  - `Timestamp`: Fecha y hora UTC precisa del evento.
  - `IP`: Dirección IP de origen de la solicitud.
  - `User ID & Role`: Quién ejecutó la acción.
  - `Action`: Tipo de acción (`LOGIN`, `UPLOAD`, `DOWNLOAD`, `DOWNLOAD_REQUEST`, `DENIED`, etc.).
  - `Document ID`: Documento afectado.
  - `Status`: Resultado de la operación (`SUCCESS` o `FAILED`).
  - `Details`: Notas sobre el motivo del fallo o detalles técnicos adicionales.
* **Destino:** Se almacena en `backend/logs/audit.log` (debería exportarse a un SIEM o sistema externo de agregación de logs en producción).

---

## 3. Lista de Verificación (Checklist) de Cumplimiento RGPD

Esta lista de verificación cubre los requisitos legales obligatorios para el despliegue del sistema de documentos jurídicos:

- [x] **Minimización de Datos (Art. 5.1.c):** Solo se recopila la metadata necesaria del documento y el rol mínimo del usuario para procesar las autorizaciones.
- [x] **Cifrado de Datos Personales (Art. 32):** Implementación técnica de cifrado AES-256 en reposo y uso obligatorio de HTTPS en tránsito (TLS 1.3 recomendado).
- [ ] **Políticas de Retención de Datos (Art. 5.1.e):** Configurar triggers de base de datos o scripts automáticos que eliminen de forma definitiva los archivos lógicamente borrados (`status = 'deleted'`) tras expirar el periodo de conservación legal obligatorio.
- [x] **Control de Accesos Basado en Roles (RBAC):** Restricción de lectura y escritura basada en los roles del usuario (`administrador`, `abogado`, `cliente`).
- [ ] **Procedimiento para Brechas de Seguridad (Art. 33):** Configurar alertas en el log de auditoría para detectar accesos fallidos repetidos (`DENIED` o `INVALID_TOKEN_ACCESS`), notificando al Delegado de Protección de Datos (DPO) en menos de 72 horas en caso de incidente verificado.
- [ ] **Gestión de Claves Criptográficas (KMS):** En producción, la variable `ENCRYPTION_KEY` del archivo `.env` debe almacenarse y rotarse mediante un servicio de gestión de claves seguro (ej. *Google Cloud KMS*, *AWS KMS* o *HashiCorp Vault*) y nunca almacenarse directamente en texto plano en el servidor web.
