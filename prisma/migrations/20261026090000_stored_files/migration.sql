-- Archivos subidos (logotipo) almacenados en la base de datos.
CREATE TABLE "stored_file" (
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("name"),
    CONSTRAINT "stored_file_size" CHECK (octet_length("data") <= 1048576)
);
