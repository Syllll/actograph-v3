import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { Roles } from '@users/utils/roles.decorator';
import { allMainUsers, UserRoleEnum } from '@users/utils/user-role.enum';
import { ApplyExchangeDto, PreviewExchangeDto } from '../dtos/exchange.dto';
import { ExchangeService } from '../services/exchange.service';

@Controller('observations/:id/exchange')
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Roles(UserRoleEnum.User, ...allMainUsers)
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post('legacy-protocol')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  legacyProtocol(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    return this.exchangeService.parseLegacyProtocol(id, req.user.id, file);
  }

  @Get()
  snapshot(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.exchangeService.snapshot(id, req.user.id);
  }

  @Post('preview')
  preview(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PreviewExchangeDto,
    @Req() req: any,
  ) {
    return this.exchangeService.preview(id, req.user.id, body);
  }

  @Post('apply')
  apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApplyExchangeDto,
    @Req() req: any,
  ) {
    return this.exchangeService.apply(id, req.user.id, body);
  }
}
