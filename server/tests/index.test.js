import { getResponse, resetAndMockDB } from '@utils/testUtils';

const query = `
  query {
    __schema {
      queryType {
        fields {
          name
        }
      }
    }
  }
  `;
describe('init', () => {
  const mocks = {};
  it('should successfully configure environment variables and connect to the database', async () => {
    mocks.dotenv = {
      config: jest.fn
    };
    jest.doMock('dotenv', () => mocks.dotenv);
    jest.spyOn(mocks.dotenv, 'config');
    await require('../index');

    // check if the environments are being configured correctly
    expect(mocks.dotenv.config.mock.calls.length).toBe(1);
    expect(mocks.dotenv.config.mock.calls[0][0]).toEqual({ path: `.env.${process.env.ENVIRONMENT}` });
  });

  it('should start the server and listen for /grapqhl', async () => {
    const { init, app } = await require('../index');
    mocks.app = app;
    jest.spyOn(mocks.app, 'use');
    await init();

    // check if the server has been started
    expect(mocks.app.use.mock.calls.length).toBe(1);
    expect(mocks.app.use.mock.calls[0][0]).toEqual('/graphql');
  });

  it('should invoke @database.connect ', async () => {
    mocks.db = { getClient: jest.fn(), connect: jest.fn() };
    jest.spyOn(mocks.db, 'connect');
    jest.doMock('@database', () => mocks.db);

    await require('../index');

    // the database connection is being made
    expect(mocks.db.connect.mock.calls.length).toBe(1);
  });

  it('should succeed when a valid request is made ', async () => {
    const { app } = await require('../index');
    await getResponse(query, app).then(response => {
      expect(response.statusCode).toBe(200);
      expect(response.body.data.__schema).toBeTruthy();
    });
  });

  it('should fail when an invalid request is made ', async () => {
    const { app } = await require('../index');
    await getResponse(
      `\n  query {\n    __schema1 {\n      queryType {\n        fields {\n          name\n        }\n      }\n    }\n  }\n  `,
      app
    ).then(response => {
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeTruthy();
    });
  });
});
describe('TestApp: Server', () => {
  it('should respond to /graphql', async done => {
    resetAndMockDB();
    await getResponse(query).then(response => {
      expect(response.statusCode).toBe(200);
      expect(response.body.data.__schema.queryType.fields[0].name).toBeTruthy();
      done();
    });
  });
});
