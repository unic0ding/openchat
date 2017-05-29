import {Injectable} from '@angular/core';
import {WebsocketService} from './websocket.service';
import {Message} from '../model/message.model';
import {Observable} from 'rxjs/Observable';
import {Channel} from '../model/channel.model';

@Injectable()
export class ChatService {

  constructor(private webSocketService: WebsocketService) {
  }

  sendMessage(message: Message, channel: Channel) {
    const command = {type: 'command', subtype: 'message', command: 'newMessage', data: {message: message, channel: channel}};
    this.webSocketService.emit(command);
    console.log(message.id); // just for tests
    return this.getListener()
      .filter(event => event.data.roomName === channel.name && event.data.id === message.id);
  }

  getListener(): Observable<any> {
    const listener$ = this.webSocketService.getListener()
      .filter((data) => data.subtype === 'chat');
    return listener$;
  }
}
