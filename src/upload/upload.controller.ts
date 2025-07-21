import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { Request } from 'express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      return { success: false, message: 'Nenhum arquivo enviado' };
    }

    const cliente = (req as any).cliente;

    if (!cliente || !cliente.token) {
      throw new ForbiddenException('Token não encontrado no contexto da requisição');
    }
    
    console.log('🚀 REQ.CLIENTE:', (req as any).cliente);


    const resultado = await this.uploadService.enviarArquivo(
      file.buffer,
      file.originalname,
      cliente.token,
    );

    return { success: true, message: resultado };
  }
}
