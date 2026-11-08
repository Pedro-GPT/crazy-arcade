-- Una fila por cada vez que alguien entra a un juego. Sin IP.
-- En una base ya creada sin nombre: ALTER TABLE sesiones ADD COLUMN nombre TEXT;
CREATE TABLE IF NOT EXISTS sesiones (
  id       TEXT PRIMARY KEY,
  persona  TEXT NOT NULL,            -- código aleatorio guardado en el navegador
  nombre   TEXT,                     -- nombre que escribió la persona (puede faltar)
  juego    TEXT NOT NULL,
  inicio   INTEGER NOT NULL,         -- milisegundos, reloj del servidor
  ultimo   INTEGER NOT NULL,         -- último aviso recibido
  segundos INTEGER NOT NULL DEFAULT 0 -- tiempo con la pestaña visible
);
