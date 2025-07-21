import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TokenMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const tokenHeader = req.headers['x-api-token'];

    if (!tokenHeader || typeof tokenHeader !== 'string') {
      throw new ForbiddenException('Token ausente ou inválido');
    }

    const token = tokenHeader.trim();

    try {
      // 🔍 Verifica se o token existe na tabela tblAtivacaoSistema
      const empresa = await prisma.tblAtivacaoSistema.findFirst({
        where: { Token: token },
      });

      if (!empresa) {
        throw new ForbiddenException('Token não autorizado');
      }

      // ✅ Normaliza o nome do campo para "token" (minúsculo)
      (req as any).cliente = {
        id: empresa.id,
        token: empresa.Token,
      };

      console.log('✅ TOKEN AUTORIZADO:', (req as any).cliente);
      next();
    } catch (err) {
      console.error('Erro ao verificar token:', err);
      throw new ForbiddenException('Erro na verificação do token');
    }
  }
}
