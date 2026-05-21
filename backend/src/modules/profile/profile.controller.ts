import { Body, Controller, Get, Patch, Put, Request, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtGuard } from '../auth/jwt.guard';
import { UpdateProfileDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtGuard)
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user, dto);
  }

  @Patch('preferences')
  updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body('preferredFont') preferredFont?: string,
  ) {
    return this.profileService.updatePreferences(req.user, { preferredFont });
  }
}
