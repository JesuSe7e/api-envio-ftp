// juntarArquivos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

// Ajuste aqui se quiser incluir/remover pastas
const diretoriosPermitidos = ['src', 'prisma', 'test'];

// Arquivos extras no root (adicione o que julgar necessário)
const arquivosExtras = [
  'package.json',
  'package-lock.json',
  'nest-cli.json',
  'tsconfig.json',
  'tsconfig.build.json',
  'eslint.config.mjs',
  '.prettierrc',
  '.gitignore',
  'README.md'
];

const arquivoSaida = 'projeto-completo.md';

const ignorarPastas = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'public'
];
const ignorarExtensoes = [
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.ico', '.PNG','.json'
];

// --- Helpers ---------------------------------------------------------------

function deveIgnorarPasta(absPath) {
  const rel = path.relative(ROOT, absPath);
  const partes = rel.split(path.sep);
  return ignorarPastas.some(p => partes.includes(p));
}

function listarArquivos(diretorio) {
  const absDir = path.resolve(ROOT, diretorio);
  let arquivos = [];
  if (!fs.existsSync(absDir)) return arquivos;

  for (const item of fs.readdirSync(absDir)) {
    const caminhoCompleto = path.join(absDir, item);
    const stat = fs.statSync(caminhoCompleto);

    if (stat.isDirectory()) {
      if (!deveIgnorarPasta(caminhoCompleto)) {
        arquivos = arquivos.concat(listarArquivos(caminhoCompleto));
      }
    } else {
      const ext = path.extname(caminhoCompleto).toLowerCase();
      if (
        !ignorarExtensoes.includes(ext) &&
        path.basename(caminhoCompleto) !== arquivoSaida
      ) {
        arquivos.push(caminhoCompleto);
      }
    }
  }

  return arquivos;
}

function getLinguagemMarkdown(extensao) {
  switch (extensao) {
    case '.ts':      return 'ts';
    case '.tsx':     return 'tsx';
    case '.js':      return 'js';
    case '.jsx':     return 'jsx';
    case '.json':    return 'json';
    case '.css':     return 'css';
    case '.html':    return 'html';
    case '.mjs':     return 'js';
    case '.prisma':  return 'prisma';
    default:         return '';
  }
}

function escreverArquivo(stream, arquivoAbs) {
  try {
    const conteudo = fs.readFileSync(arquivoAbs, 'utf-8');
    const ext = path.extname(arquivoAbs).toLowerCase();
    const linguagem = getLinguagemMarkdown(ext);
    const relPath = path.relative(ROOT, arquivoAbs);

    stream.write(`\n\n## ${relPath}\n\n`);
    stream.write(`\`\`\`${linguagem}\n`);
    stream.write(conteudo);
    stream.write(`\n\`\`\`\n`);
  } catch (erro) {
    console.warn(`Erro ao ler ${arquivoAbs}: ${erro.message}`);
  }
}

// --- Main ------------------------------------------------------------------

function salvarConteudo() {
  const stream = fs.createWriteStream(path.join(ROOT, arquivoSaida), {
    flags: 'w',
    encoding: 'utf-8'
  });

  // Pastas permitidas
  for (const dir of diretoriosPermitidos) {
    const arquivos = listarArquivos(dir);
    arquivos.forEach(a => escreverArquivo(stream, a));
  }

  // Arquivos extras do root
  for (const arquivo of arquivosExtras) {
    const abs = path.resolve(ROOT, arquivo);
    if (fs.existsSync(abs)) {
      escreverArquivo(stream, abs);
    }
  }

  stream.end(() => {
    console.log(`✅ Arquivo Markdown gerado: ${arquivoSaida}`);
  });
}

salvarConteudo();
