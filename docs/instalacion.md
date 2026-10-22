# Instalación (desarrollo local)

> Estado: la aplicación se inicializa en la Fase 1. Este documento se completará y verificará entonces.

## Requisitos
- Node.js ≥ 22 (verificado en el equipo: 24.18.0)
- pnpm ≥ 10 (verificado: 11.1.3)
- PostgreSQL 16+ — nativo, Docker (`docker compose up -d`) o una base Neon de desarrollo
- Git y GitHub CLI

## Pasos (previstos)
```bash
git clone https://github.com/loboaguilar26-byte/iglesia-management-system.git
cd iglesia-management-system
cp .env.example .env      # editar DATABASE_URL y BETTER_AUTH_SECRET
pnpm install
pnpm db:migrate
pnpm db:seed              # solo datos ficticios, solo en desarrollo
pnpm setup:admin          # crea el primer administrador de forma interactiva
pnpm dev
```

## Nota sobre OneDrive
La carpeta de trabajo actual está dentro de OneDrive. `node_modules` y `.next` generan decenas de miles de archivos que OneDrive intentará sincronizar (lentitud, bloqueos de archivos). Se recomienda clonar el repositorio fuera de OneDrive (p. ej. `C:\dev\iglesia-management-system`).
