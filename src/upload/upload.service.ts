import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import { fileTypeFromBuffer } from 'file-type';
import * as path from 'path';

@Injectable()
export class UploadService {
  async enviarArquivo(buffer: Buffer, nomeOriginal: string, token: string): Promise<string> {
    // ✅ Verifica extensão do nome do arquivo
    if (!nomeOriginal.toLowerCase().endsWith('.accdb')) {
      throw new BadRequestException('Tipo de arquivo não permitido. Apenas .accdb é aceito');
    }

    // 🧪 Valida o conteúdo do arquivo
    const tipo = await fileTypeFromBuffer(buffer);
    if (tipo && tipo.mime !== 'application/x-msaccess') {
      throw new BadRequestException(`Arquivo inválido. Tipo detectado: ${tipo?.mime ?? 'desconhecido'}`);
    }

    const client = new ftp.Client();
    client.ftp.verbose = true;

    // 🔧 Variáveis do ambiente
    const pastaBase = process.env.FTP_PASTA ?? '';
    const prefixo = process.env.FTP_PREFIXO ?? 'backup_';
    const extensao = process.env.FTP_EXT ?? 'accdb';
    const max = parseInt(process.env.FTP_MAX_ARQUIVOS ?? '2');

    // 📁 Nome da pasta por token (sanitizado)
    const tokenSanitizado = token.replace(/[^a-zA-Z0-9_-]/g, '');
    const pastaFinal = path.posix.join('/', pastaBase, tokenSanitizado);
    console.log('📁 Pasta final no FTP:', pastaFinal);

    // 🕒 Nome do novo arquivo
    const dataAgora = new Date();
    const nomeNovo = `${prefixo}${dataAgora.toISOString().replace(/[:.]/g, '-')}.${extensao}`;

    try {
      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        secure: process.env.FTP_SECURE === 'true',
      });

      console.log('📡 Conectado ao FTP com sucesso');

      // 📂 Cria e entra nas pastas passo a passo
      // 📂 Cria toda a pasta de uma vez e entra nela
      await client.ensureDir(pastaFinal);


      // 📃 Lista arquivos da pasta atual
      const arquivos = await client.list();
      const backups = arquivos
        .filter(file => file.name.startsWith(prefixo) && file.name.endsWith(`.${extensao}`))
        .sort((a, b) => {
          const aTime = a.modifiedAt?.getTime() || 0;
          const bTime = b.modifiedAt?.getTime() || 0;
          return aTime - bTime;
        });

      // 🧹 Remove arquivos antigos se necessário
      while (backups.length >= max) {
        const maisAntigo = backups.shift();
        if (maisAntigo) {
          console.log(`🗑️ Removendo: ${maisAntigo.name}`);
          await client.remove(maisAntigo.name);
        }
      }

      // 📤 Envia novo arquivo
      const stream = Readable.from(buffer);
      await client.uploadFrom(stream, nomeNovo);
      console.log(`✅ Upload concluído: ${pastaFinal}/${nomeNovo}`);

      return `Arquivo enviado para ${pastaFinal}/${nomeNovo}`;
    } catch (error) {
      console.error('❌ Erro ao enviar via FTP:', error);
      throw new InternalServerErrorException('Erro ao enviar arquivo via FTP');
    } finally {
      client.close();
    }
  }
}
