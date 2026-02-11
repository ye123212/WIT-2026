import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RuleBasedModerationService } from '../moderation/rule-based-moderation.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'realtime' })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly moderationService: RuleBasedModerationService) {}

  handleConnection(client: Socket) {
    client.emit('connected', { ok: true, socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    client.emit('disconnected', { ok: true });
  }

  @SubscribeMessage('join_match_queue')
  onJoinQueue(@ConnectedSocket() client: Socket, @MessageBody() payload: { userId: string }) {
    client.join(`queue:${payload.userId}`);
    client.emit('queue_update', { status: 'queued', userId: payload.userId });
  }

  @SubscribeMessage('chat_message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; senderId: string; message: string },
  ) {
    const result = this.moderationService.moderateMessage(payload.message);

    if (!result.allowed) {
      client.emit('moderation_block', { reasons: result.reasons, severity: result.severity });
      return;
    }

    this.server.to(payload.sessionId).emit('chat_message', payload);
  }

  @SubscribeMessage('join_conversation')
  onJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() payload: { sessionId: string }) {
    client.join(payload.sessionId);
    client.emit('conversation_joined', { sessionId: payload.sessionId });
  }
}
