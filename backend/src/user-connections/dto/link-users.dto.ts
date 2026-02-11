import { IsNotEmpty, IsString } from 'class-validator';

export class LinkUsersDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  linkedUserId!: string;
}
