import hijackStream from 'hijack-stream';
import { promisify } from 'util';
import type { Readable, Writable } from 'stream';
import type { ReadStream } from 'tty';

type Options = {
  input?: Readable | ReadStream;
  output?: Writable;
};

class CancelError extends Error {
  constructor () {
    super('The request was aborted by the user');
  }

  get code () {
    return 'ECANCELED';
  }
}

function askCharacterImpl (
  streamOrOptions: Readable | ReadStream | Options,
  callback: ((err: Error) => void) & ((err: null, result: string) => void)) {
  let input: Readable | ReadStream;
  let options: Options;
  if ('input' in streamOrOptions) {
    input = streamOrOptions.input;
    options = streamOrOptions;
  } else {
    input = streamOrOptions as Readable;
    options = {};
  }
  let buf = Buffer.alloc(0);
  const isTTY: boolean = 'isTTY' in input && input.isTTY;

  const { restore } = hijackStream({
    stream: input,
    ondata (input: Buffer | string) {
      let char = '';
      let length = 0;
      if (typeof input === 'string') {
        if (input.length === 0) return;
        length = input.codePointAt(0) >= 0x10000 ? 2 : 1;
        char = input.slice(0, length);
        restore(input.slice(length));
      } else {
        buf = Buffer.concat([buf, input]);
        if ((buf[0] & 0xc0) !== 0xc0) length = 1;
        else if ((buf[0] & 0xe0) === 0xc0) length = 2;
        else if ((buf[0] & 0xf0) === 0xe0) length = 3;
        else if ((buf[0] & 0xf8) === 0xf0) length = 4;
        else if ((buf[0] & 0xfc) === 0xf8) length = 5;
        else length = 6;
        if (buf.length < length) return;
        char = buf.toString('utf8', 0, length);
        restore(buf.slice(length));
      }
      options.output?.write(char);

      if (isTTY && (char === '\u0003' || char === '\u0004')) {
        callback(new CancelError());
      } else {
        callback(null, char);
      }
    },
    onend (err: null | Error) {
      if (err) {
        callback(err);
      } else {
        callback(null, '');
      }
    }
  });
}

export = promisify(askCharacterImpl);
