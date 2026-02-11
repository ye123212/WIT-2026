import { IsNotEmpty, IsUUID } from 'class-validator';

export class ConnectChatDto {
  @IsUUID()
  @IsNotEmpty()
  connectionUserId!: string;
}
