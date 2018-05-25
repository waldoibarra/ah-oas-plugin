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
      security: null
    }
  }
}
