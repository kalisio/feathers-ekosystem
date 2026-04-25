export const UserEvents = {
  login: {
    kcVersion: '22.0.5',
    dateTime: '2024-04-27T21:59:36.779Z',
    time: 1714255176779,
    realmId: '3892b252-b2ed-4060-bca0-105ff5a7ef3b',
    realmName: 'Kalisio',
    ipAddress: '172.17.0.1',
    clientId: 'account-console',
    sessionId: '5c5a1e79-3ffb-4699-9ca1-3c3f11a5c8f5',
    eventClass: 'Event',
    type: 'LOGIN',
    userId: '96352ea3-d876-48f4-99f5-c3a416759a6a',
    username: 'johndoo',
    error: null,
    details: {
      auth_method: 'openid-connect',
      auth_type: 'code',
      redirect_uri: 'http://localhost:8080/realms/Kalisio/account/#/',
      consent: 'no_consent_required',
      code_id: '5c5a1e79-3ffb-4699-9ca1-3c3f11a5c8f5',
      username: 'johndoo'
    }
  },
  logout: {
    kcVersion: '22.0.5',
    dateTime: '2024-04-27T22:41:15.010Z',
    time: 1714257675010,
    realmId: '3892b252-b2ed-4060-bca0-105ff5a7ef3b',
    realmName: 'Kalisio',
    ipAddress: '172.17.0.1',
    clientId: null,
    sessionId: '2a68846a-607d-4a1d-90d3-bae5f109b69e',
    eventClass: 'Event',
    type: 'LOGOUT',
    userId: '96352ea3-d876-48f4-99f5-c3a416759a6a',
    username: 'johndoo',
    error: null,
    details: {
      redirect_uri: 'http://localhost:8080/realms/Kalisio/account/#/'
    }
  }
}
