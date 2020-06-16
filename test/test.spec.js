// @ts-nocheck
const lib = require('..');

describe('RxSocketClient', () => {
  /** @type {import("../dist/src").RxSocketClient} */
  let client;
  const data = {
    prop1: 'val1',
    prop2: 'val2',
  };

  beforeAll(() => {
    client = new lib.RxSocketClient('ws://localhost:3000');
    return client.init().toPromise();
  });

  test('should emit data and receive same response', (done) => {
    expect.assertions(1);

    client.emit('data', data)
      .subscribe((response) => {
        expect(data.toString() === response.toString()).toBe(true);

        done();
      });
  });

  afterAll(() => {
    client.close();
    client = null;
  });
});
