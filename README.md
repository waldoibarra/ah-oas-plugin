# ah-oas-plugin

[![npm version](https://badge.fury.io/js/ah-oas-plugin.svg)](https://badge.fury.io/js/ah-oas-plugin)

Generate OpenApi Specification documentation for ActionHero

![screenshot](https://raw.githubusercontent.com/walbertoibarra/ah-oas-plugin/develop/docs/screenshots/openapi.png)

## Install and setup

~~~ sh
$ npm install ah-oas-plugin --save
~~~

Make sure you add the plugin to `config/plugins.js`:

~~~ js
'use strict'

const path = require('path')

exports['default'] = {
  plugins: (api) => {
    return {
      'ah-oas-plugin': { path: path.join(__dirname, '../node_modules/ah-oas-plugin') }
    }
  }
}
~~~

You can now access your project documentation on: [http://127.0.0.1:8080/public/oas](http://127.0.0.1:8080/public/oas)

## Usage

This plugin will analyse your project's actions, generate a OpenApi Specification file
on your public folder and display it with Swagger UI.

Here's an action example:

~~~ js
'use strict'

const { Action, api } = require('actionhero')

module.exports = class Status extends Action {
  constructor () {
    super()

    this.name = 'status'
    this.description = 'I will return some basic information about the API'

    this.middleware = [
      'validateJwtMiddleware'
    ]

    this.headers = {
      'Accept-Language': {
        description: 'Which languages the client is able to understand, and which locale variant is preferred.',
        required: false,
        schema: {
          type: 'string'
        },
        example: 'en-US'
      }
    }

    this.responseSchemas = {
      '200': {
        description: 'OK.',
        schema: {
          type: 'object'
        }
      }
    }

    this.inputs = {
      email: {
        description: 'User type.',
        required: true,
        type: 'string',
        example: 'user@example.com'
      },
      age: {
        description: 'User age.',
        required: true,
        type: 'integer',
        example: 30
      }
    }

    this.tags = ['Core']

    this.security = [
      {
        'api_key': []
      }
    ]
  }

  async run (data) {
    // ...
  }
}

~~~

## Configuration

Edit values on `config/oas.js`:

~~~ js
'use strict'

exports.default = {
  oas: (api) => {
    return {
      // Directory to render client-side JS.
      // Path should start with "/" and will be built starting from `api.config.general.paths.public`.
      openApiDocumentPath: '/',
      // The name of the OpenAPI document JSON file.
      // Do not include the file exension.
      // Set to `undefined` to not save the OpenAPI document JSON file on boot.
      openApiDocumentName: 'openapi',
      // Should be changed to hit www.yourserver.com.  If this is null, defaults to ip:port from
      // internal values or from hostOverride and portOverride.
      baseUrl: '127.0.0.1:8080',
      // Specify routes that don't need to be displayed
      ignoreRoutes: [],
      // Set true if you want to organize actions by version
      groupByVersionTag: false,
      // In some cases where actionhero network topology needs to point elsewhere.
      // If null, uses api.config.oas.baseUrl
      hostOverride: null,
      // Same as above, if null uses the internal value set in config/server/web.js
      portOverride: null,

      // Extended documentation for the whole API.
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#externalDocumentationObject
      // Set to null if not needed.
      apiDocumentation: {
        description: 'Find more info about the API here',
        url: 'https://docs.actionherojs.com'
      },
      // Information about tags, you can add info about any version tag (including version tags).
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#tagObject
      // Set to null if not needed.
      tagsInfo: {
        '1': {
          description: 'Version 1 of the API',
          externalDocs: {
            description: 'Find more info here',
            url: 'https://docs.actionherojs.com/'
          }
        },
        'Core': {
          description: 'Core actions'
        }
      },
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#serverObject
      servers: null,
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject
      security: {
        'api_key': {
          type: 'apiKey',
          name: 'Authorization',
          'in': 'header'
        },
        'petstore_auth': {
          'type': 'oauth2',
          'flows': {
            'implicit': {
              'authorizationUrl': 'http://example.org/api/oauth/dialog',
              'scopes': {
                'write:pets': 'modify pets in your account',
                'read:pets': 'read your pets'
              }
            }
          }
        }
      }
    }
  }
}
~~~
