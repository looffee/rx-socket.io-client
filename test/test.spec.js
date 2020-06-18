// @ts-nocheck
const lib = require('..');

describe('RxSocketClient', () => {
  /** @type {import("../dist/src").RxSocketClient} */
  let client;
  const data = {
    prop1: 'val1',
    prop2: 'val2',
  };
  const token = 'token';

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

  test('should properly handle multiple connections', (done) => {
    const secondClient = new lib.RxSocketClient('ws://localhost:3000', {
      query: `auth_token=${token}`,
      transports: ['websocket'],
      forceNew: true,
    });

    expect.assertions(1);

    secondClient.init()
      .subscribe(() => {
        secondClient.emit('data', data)
          .subscribe((response) => {
            expect(data.toString() === response.toString()).toBe(true);

            secondClient.close();

            done();
          });
      });
  });

  afterAll(() => {
    client.close();
    client = null;
  });
});
