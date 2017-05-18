import {AfterViewInit, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {Channel} from '../../share/model/channel.model';
import {Observable} from 'rxjs/Observable';
import {RoomService} from '../../share/services/room.service';

@Component({
  selector: 'app-channel-list',
  templateUrl: './channel-list.component.html',
  styleUrls: ['./channel-list.component.css']
})
export class ChannelListComponent implements OnInit, AfterViewInit {
  @Output() newChannel = new EventEmitter();
  viewChannelList = [];
  channelList = [];

  constructor(private roomService: RoomService) {
    // TODO: get All Rooms from RoomService
    // this.channelList.push(new Channel('AngularChannel', []));
    // this.channelList.push(new Channel('PythonChannel', []));
    // this.channelList.push(new Channel('JS_Channel', []));
    // this.channelList.push(new Channel('Android_Channel', []));
    // this.channelList.push(new Channel('JavaChan', []));
    this.viewChannelList = this.channelList;
  }

  ngAfterViewInit(): void {

    // get Channel Listener
    const channelListener$ = this.roomService.getListener()
      .do(console.log);

    channelListener$.subscribe(event => {
      console.log(event);
      if (event.subtype === 'newRoom') {
        this.channelList.push(Channel.fromJson(event.data));
      }
      if (event.subtype === 'allRooms') {
        this.channelList = Channel.fromJsonArray(event.data);
        this.viewChannelList = this.channelList.sort();
      }
    });


    // Channel Search Observable
    const search: any = document.getElementById('channelSearchInput');
    const channelSource$ = Observable.fromEvent(search, 'input')
      .debounceTime(250)
      .do(() => this.viewChannelList = [])
      .switchMap(() => Observable.from(this.channelList))
      .filter(c => {
        if (c.name.toLowerCase().includes(search.value.toLowerCase())) {
          return c;
        }
      });
    channelSource$.subscribe(
      (contact) => {
        this.viewChannelList.push(contact);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  onConnectNewChannel(channel: Channel) {
    this.newChannel.emit(channel);
  }

  ngOnInit() {
  }

}
