// Hook PreToolUse de Claude Code: bloquea el acceso a archivos .env* (salvo .env.example)
// desde las herramientas de archivos y desde comandos de terminal. Es una red de seguridad
// adicional a las reglas de .claude/settings.json; no sustituye a un sandbox.

const ARCHIVO_ENV = /^\.env(\.[\w.-]+)?$/;
const MENCION_ENV = /(?:^|[\s"'`/\\=:(<>])(\.env(?:\.[\w.-]+)?)(?=$|[\s"'`;|&)<>,\\])/g;

const permitido = (nombre) => nombre === ".env.example";

function archivoProtegido(ruta) {
  const nombre = ruta.split(/[\\/]/).pop() ?? "";
  return ARCHIVO_ENV.test(nombre) && !permitido(nombre);
}

function comandoProtegido(comando) {
  return [...comando.matchAll(MENCION_ENV)].some(([, nombre]) => !permitido(nombre));
}

function debeBloquear({ tool_name: herramienta, tool_input: entrada = {} }) {
  if (herramienta === "Bash" || herramienta === "PowerShell") {
    return comandoProtegido(String(entrada.command ?? ""));
  }
  return archivoProtegido(String(entrada.file_path ?? entrada.notebook_path ?? ""));
}

let datos = "";
for await (const parte of process.stdin) datos += parte;

let evento;
try {
  evento = JSON.parse(datos);
} catch {
  process.exit(0);
}

if (debeBloquear(evento)) {
  console.error("Bloqueado por ChetoOMG: los archivos .env* contienen secretos y no se leen ni se editan. Usa .env.example como referencia.");
  process.exit(2);
}
