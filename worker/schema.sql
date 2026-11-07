-- Una fila por cada vez que alguien entra a un juego. Sin nombres ni IP.
CREATE TABLE IF NOT EXISTS sesiones (
  id       TEXT PRIMARY KEY,
  persona  TEXT NOT NULL,            -- código aleatorio guardado en el navegador
  juego    TEXT NOT NULL,
  inicio   INTEGER NOT NULL,         -- milisegundos, reloj del servidor
  ultimo   INTEGER NOT NULL,         -- último aviso recibido
  segundos INTEGER NOT NULL DEFAULT 0 -- tiempo con la pestaña visible
);
