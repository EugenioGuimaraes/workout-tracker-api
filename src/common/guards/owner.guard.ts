import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// Placeholder — implementação completa no módulo workout-plans (etapa 7)
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    void context;
    return true;
  }
}
