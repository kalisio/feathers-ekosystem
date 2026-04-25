export const AdminEvents = {
  createUser: {
    kcVersion: '22.0.5',
    dateTime: '2024-04-27T16:45:49.308Z',
    time: 1714236349308,
    realmId: '2b1c9854-ba47-4770-93d0-a00f6ef804e5',
    realmName: 'Kalisio',
    authDetails: {
      ipAddress: '172.20.0.1',
      realmId: 'b3936136-db71-4636-9f07-c294a6b49bc8',
      realmName: 'master',
      clientId: '24cda833-34cd-4094-a839-179f595045bc',
      userId: '51383fc6-4243-4c1f-afc1-84986e6624c6',
      username: 'admin'
    },
    eventClass: 'AdminEvent',
    operationType: 'CREATE',
    resourceType: 'USER',
    resourcePath: 'users/96352ea3-d876-48f4-99f5-c3a416759a6a',
    error: null,
    value: {
      username: 'johndoo',
      enabled: true,
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doo',
      email: 'johndoo@gmail.com',
      requiredActions: [],
      groups: []
    },
    representation: '{"username":"johndoo","enabled":true,"emailVerified":true,"firstName":"John","lastName":"Doo","email":"john.doo@gmail.com","requiredActions":[],"groups":[]}'
  },
  updateUser: {
    kcVersion: '22.0.5',
    dateTime: '2024-04-27T20:56:20.216Z',
    time: 1714251380216,
    realmId: '3892b252-b2ed-4060-bca0-105ff5a7ef3b',
    realmName: 'Kalisio',
    authDetails: {
      ipAddress: '172.17.0.1',
      realmId: 'a7ae58a8-f583-4f69-8ea4-f511f555c2ca',
      realmName: 'master',
      clientId: '83efccb9-f46f-4fee-b767-2fcb3a0f26e7',
      userId: '72bb6bc3-17f6-4fe2-8e86-82018cef8ba8',
      username: 'admin'
    },
    eventClass: 'AdminEvent',
    operationType: 'UPDATE',
    resourceType: 'USER',
    resourcePath: 'users/96352ea3-d876-48f4-99f5-c3a416759a6a',
    error: null,
    value: {
      id: '96352ea3-d876-48f4-99f5-c3a416759a6a',
      createdTimestamp: 1714251368388,
      username: 'johndoo',
      enabled: true,
      totp: false,
      emailVerified: true,
      firstName: 'John',
      lastName: 'Doo2',
      email: 'john.doo@gmail.com',
      attributes: {},
      disableableCredentialTypes: [],
      requiredActions: [],
      notBefore: 0,
      access: {
        manageGroupMembership: true,
        view: true,
        mapRoles: true,
        impersonate: true,
        manage: true
      },
      userProfileMetadata: {
        attributes: [
          {
            name: 'username',
            displayName: 'username',
            required: true,
            readOnly: true,
            validators: {}
          },
          {
            name: 'email',
            displayName: 'email',
            required: true,
            readOnly: false,
            validators: {
              email: {
                'ignore.empty.value': true
              }
            }
          }
        ],
        groups: []
      }
    },
    representation: '{"id":"96352ea3-d876-48f4-99f5-c3a416759a6a","createdTimestamp":1714251368388,"username":"johndoo","enabled":true,"totp":false,"emailVerified":true,"firstName":"John","lastName":"Doo","email":"john.doo@gmail.com","attributes":{},"disableableCredentialTypes":[],"requiredActions":[],"notBefore":0,"access":{"manageGroupMembership":true,"view":true,"mapRoles":true,"impersonate":true,"manage":true},"userProfileMetadata":{"attributes":[{"name":"username","displayName":"username","required":true,"readOnly":true,"validators":{}},{"name":"email","displayName":"email","required":true,"readOnly":false,"validators":{"email":{"ignore.empty.value":true}}}],"groups":[]}}'
  },
  deleteUser: {
    kcVersion: '22.0.5',
    dateTime: '2024-04-27T21:26:07.237Z',
    time: 1714253167237,
    realmId: '3892b252-b2ed-4060-bca0-105ff5a7ef3b',
    realmName: 'Kalisio',
    authDetails: {
      ipAddress: '172.17.0.1',
      realmId: 'a7ae58a8-f583-4f69-8ea4-f511f555c2ca',
      realmName: 'master',
      clientId: '83efccb9-f46f-4fee-b767-2fcb3a0f26e7',
      userId: '72bb6bc3-17f6-4fe2-8e86-82018cef8ba8',
      username: 'admin'
    },
    eventClass: 'AdminEvent',
    operationType: 'DELETE',
    resourceType: 'USER',
    resourcePath: 'users/96352ea3-d876-48f4-99f5-c3a416759a6a',
    error: null,
    value: null,
    representation: null
  }
}
