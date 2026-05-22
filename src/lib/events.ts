import { EventEmitter } from 'events';

let chatEmitter: EventEmitter;

if ((global as any).chatEmitter) {
  chatEmitter = (global as any).chatEmitter;
} else {
  chatEmitter = new EventEmitter();
  chatEmitter.setMaxListeners(100);
  (global as any).chatEmitter = chatEmitter;
}

export { chatEmitter };
