import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {Message} from '../../share/model/message.model';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Channel} from '../../share/model/channel.model';
import {ChatService} from '../../share/services/chat.service';
import {Subject} from 'rxjs/Subject';
import {AuthService} from '../../share/services/auth.service';
import {Observable} from 'rxjs/Observable';
import {MdDialog, MdDialogConfig} from '@angular/material';
import {ChatInfoDialogComponent} from '../chat-info-dialog/chat-info-dialog.component';
import {newGuid} from '../../share/utils/guid-generator';

@Component({
  selector: 'app-chat-card',
  templateUrl: './chat-card.component.html',
  styleUrls: ['./chat-card.component.css']
})
export class ChatCardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() closeWindow = new EventEmitter();
  @Output() saveMessages = new EventEmitter();
  @Input() channel: Channel;
  @ViewChild('searchMessagesInput') searchInput: ElementRef;
  private messages = [];
  private viewMessages = [];
  private chatForm: FormGroup;
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  private showMessageSearch = false;
  private searchValue;

  constructor(private chatService: ChatService, private authService: AuthService, private formBuilder: FormBuilder,
              private infoDialog: MdDialog) {

    this.buildChatForm();
  }

  ngOnInit() {
    this.messages = this.channel.messages;
    this.viewMessages = this.messages;

    const messageListener$ = this.chatService.getListener()
      .filter(event => event.event === 'newMessage' || event.type === 'error');

    messageListener$
      .takeUntil(this.ngUnsubscribe)
      .subscribe(event => {
        if (event.data.roomName === this.channel.name) {
          this.messages.push({message: Message.fromJson(event.data.message), flags: {incoming: true}});
          this.viewMessages = this.messages;
          this.channel.updateNotification();
        }
        if (event.error === 'chatError') {
          console.log(event.data);
        }
      });
  }

  ngAfterViewInit(): void {
    this.buildMessageSearch();
  }

  buildChatForm() {
    this.chatForm = this.formBuilder.group({
      message: this.formBuilder.control(null, Validators.required)
    });
  }

  buildMessageSearch() {
    const messageSearch$ = Observable.fromEvent(this.searchInput.nativeElement, 'input')
      .debounceTime(250)
      .pluck('target', 'value')
      .do((val) => {
        this.viewMessages = [];
        this.searchValue = val;
      })
      .switchMap(() => Observable.from(this.messages))
      .filter((m) => {
        if (m.message.text.toLowerCase().includes(this.searchValue.toLowerCase())) {
          return m;
        }
      });

    messageSearch$.subscribe(
      (message) => {
        this.viewMessages.push(message);
      },
      (error) => {
        console.log(error);
      }
    );
  }

  closeMessageSearch() {
    this.showMessageSearch = !this.showMessageSearch;
    this.searchValue = '';
    this.viewMessages = this.messages;
  }

  private sendMessage(message?) {
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    const text = this.chatForm.value.message;
    message = {
      message: new Message(newGuid(), new Date(), this.authService.user, text),
      flags: {incoming: false, arrived: false, error: false}
    };
    this.messages.push(message);
    this.viewMessages = this.messages;
    this.chatForm.reset();

    this.chatService.sendMessage(message.message, this.channel)
      .takeUntil(ngUnsubscribe)
      .do(console.log)
      .subscribe(event => {
        if (event.event === 'messageSuccess') {
          message.flags.arrived = true;
        }
        if (event.error === 'messageError') {
          message.flags.error = true;
        }
        ngUnsubscribe.next();
        ngUnsubscribe.complete();
      });
  }

  clearHistory() {
    this.messages = [];
    this.viewMessages = this.messages;
  }

  openInfoDialog() {
    const config = new MdDialogConfig();
    config.width = '50%';
    const dialogRef = this.infoDialog.open(ChatInfoDialogComponent, config);
    dialogRef.componentInstance.channel = this.channel;

  }

  ngOnDestroy(): void {
    // save messages
    this.channel.messages = this.messages;
    this.saveMessages.emit(this.channel);
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
