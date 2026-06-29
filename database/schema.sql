-- Script SQL para base de datos PostgreSQL: Biblioteca de Documentos Jurídicos

-- Limpiar la base de datos si ya existen las tablas o tipos
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Habilitar extensión para UUIDs (opcional, pero buena práctica)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Definición de ENUM para roles de usuario
CREATE TYPE user_role AS ENUM ('administrador', 'abogado', 'cliente');

-- 1. Tabla de Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'cliente',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Documentos
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    storage_url VARCHAR(512) NOT NULL, -- URL de almacenamiento local o Firebase
    file_hash VARCHAR(64),             -- SHA-256 para integridad y deduplicación
    publication_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Etiquetas (Tags)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Intermedia para Relación Documentos - Etiquetas (Muchos a Muchos)
CREATE TABLE document_tags (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- 6. Índices para Optimización de Búsquedas
CREATE INDEX idx_documents_category ON documents(category_id) WHERE status = 'active';
CREATE INDEX idx_documents_publication_date ON documents(publication_date) WHERE status = 'active';
CREATE INDEX idx_documents_uploader ON documents(uploader_id);
CREATE INDEX idx_users_email ON users(email) WHERE status = 'active';

-- 7. Datos Iniciales Requeridos
INSERT INTO categories (name, description) VALUES
('Leyes', 'Leyes nacionales, estatales y decretos legislativos.'),
('Sentencias', 'Resoluciones judiciales emitidas por los tribunales de justicia.'),
('Contratos', 'Acuerdos de voluntades entre partes que crean obligaciones jurídicas.'),
('Jurisprudencia', 'Conjunto de sentencias y resoluciones que sientan precedentes doctrinarios.'),
('Decretos', 'Actos administrativos dictados por el poder ejecutivo con fuerza de ley.');

-- Ejemplo de inserción de etiquetas comunes
INSERT INTO tags (name) VALUES
('Tributario'),
('Laboral'),
('Penal'),
('Civil'),
('Mercantil'),
('Propiedad Intelectual'),
('Protección de Datos');
