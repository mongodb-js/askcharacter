/* eslint-disable @typescript-eslint/no-explicit-any */
import askcharacter from '..';
import assert from 'assert';
import { Readable, PassThrough } from 'stream';

describe('on regular streams', () => {
  it('reads a single character', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    const promise = askcharacter(stream);
    stream.push(Buffer.from('Banana\n'));
    assert.strictEqual(await promise, 'B');
    assert.strictEqual(stream.read().toString(), 'anana\n');
  });

  it('reads a single character (data listener variant)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    stream.on('data', (chunk) => assert.strictEqual(chunk.toString(), 'anana\n'));
    const promise = askcharacter({ input: stream });
    stream.push(Buffer.from('Banana\n'));
    assert.strictEqual(await promise, 'B');
  });

  it('reads a single character (setEncoding)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => assert.strictEqual(chunk.toString(), 'anana\n'));
    const promise = askcharacter({ input: stream });
    stream.push('Banana\n');
    assert.strictEqual(await promise, 'B');
  });

  it('reads a single character (multibyte)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    stream.on('data', (chunk) => assert.strictEqual(chunk.toString(), 'anana\n'));
    const promise = askcharacter({ input: stream });
    stream.push(Buffer.from('🎉anana\n'));
    assert.strictEqual(await promise, '🎉');
  });

  it('reads a single character (multibyte, setEncoding)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => assert.strictEqual(chunk.toString(), 'anana\n'));
    const promise = askcharacter({ input: stream });
    stream.push('🎉anana\n');
    assert.strictEqual(await promise, '🎉');
  });

  it('reads a single character (Ctrl+C)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    (stream as any).isTTY = true;
    (stream as any).setRawMode = () => { /* ignore */ };
    const promise = askcharacter({ input: stream });
    stream.push('\u0003');
    await assert.rejects(promise, { message: 'The request was aborted by the user', code: 'ECANCELED' });
  });

  it('reads a single character (early end)', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    const promise = askcharacter({ input: stream });
    stream.push(null);
    assert.strictEqual(await promise, '');
  });

  it('reads back input as requested', async () => {
    const stream = new Readable({ read () { /* ignore */ } });
    const output = new PassThrough();
    const promise = askcharacter({ input: stream, output });
    stream.push('ABC');
    assert.strictEqual(await promise, 'A');
    assert.strictEqual(output.read().toString(), 'A');
  });
});
