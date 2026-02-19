# feathers-keycloak-listener

**feathers-keycloak-listener** facilitates the management of [Keycloak events](https://www.keycloak.org/docs-api/22.0.5/javadocs/org/keycloak/events/EventType.html) emitted by [keycloak-event-gateway](https://github.com/kalisio/keycloak-event-gateway) plugin.

## Installation

```shell
pnpm add @kalisio/feathers-keycloak-listener 
```

## Configuration

Your application will define the endpoint to send the JSON to, using the standard Feathers mechanism:

````js
// `POST /api/keycloak-events` 
app.use('/api/keycloak-events', new KeycloakListenerService({
	app: app
}), {
   methods: [
     'create'
   ]
})
````

In Keycloak, you will have to configure this endpoint, along with an access token, in the
[keycloak-event-gateway](https://github.com/kalisio/keycloak-event-gateway) plugin.

Then You must define hooks around the service’s `create` method to implement the business logic 
triggered by the received event:

````js
app.getService('keycloak-events').hooks({
   before: {
      createUser: [
        async (context) => {
          const event = context.arguments[0];
          
          ...
          
          // Use the event: Acccess to 
          // event.operationType, event.resourcePath, 
          // etc.
          //
          // See some examples of JSON payloads
          // in project keycloak-event-gateway
        }
      ]
   }
})
````








