import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectChatDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
