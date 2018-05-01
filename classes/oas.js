'use strict'

const path = require('path')

const _ = require('lodash')
const { api } = require('actionhero')
const parseAuthor = require('parse-author')
const uuid = require('uuid')

const packageJson = require(api.projectRoot + path.sep + 'package.json')

module.exports = class Oas {
  constructor () {
    this._openApiDocument = {}
    this._componentsObject = null
  }

  getOpenApiDocument () {
    return this._openApiDocument
  }

  // https://swagger.io/specification/
  buildOpenApiDocument () {
    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#oasObject
    this._openApiDocument = {}

    this._componentsObject = {}

    this._openApiDocument.openapi = '3.0.1'
    this._openApiDocument.info = this._getInfoObject()

    const serverObjects = this._getServerObjects()
    serverObjects && (this._openApiDocument.servers = serverObjects)

    this._openApiDocument.security = this._getSecurityRequirementObjects()
    this._openApiDocument.paths = this._getPathsObject()

    const tagObjects = this._getTagObjects()
    tagObjects && (this._openApiDocument.tags = tagObjects)

    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#externalDocumentationObject
    api.config.oas.apiDocumentation && (this._openApiDocument.externalDocs = api.config.oas.apiDocumentation)

    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#componentsObject
    this._componentsObject && (this._openApiDocument.components = this._componentsObject)
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#infoObject
  _getInfoObject () {
    const infoObject = {}
    const contactObject = this._getContactObject()

    infoObject.title = api.config.general.serverName || packageJson.name
    packageJson.description && (infoObject.description = packageJson.description)
    contactObject && (infoObject.contact = contactObject)
    packageJson.license && (infoObject.license = { name: packageJson.license })
    infoObject.version = api.config.general.apiVersion || packageJson.version

    return infoObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#contactObject
  _getContactObject () {
    if (!packageJson.author) {
      return null
    }

    if (typeof packageJson.author === 'object') {
      return packageJson.author
    } else {
      return parseAuthor(packageJson.author)
    }
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#serverObject
  _getServerObjects () {
    const serverObjects = api.config.oas.servers
    const hasInvalidServersFromConfigFile = !serverObjects ||
      !_.isArray(serverObjects) ||
      serverObjects.length === 0 ||
      _.some(serverObjects, (s) => !s.url || typeof s.url !== 'string')

    if (hasInvalidServersFromConfigFile) {
      const scheme = api.config.servers.web.secure ? 'https' : 'http'
      const serverIp = api.config.oas.hostOverride || api.utils.getExternalIPAddress()
      const serverPort = api.config.oas.portOverride || api.config.servers.web.port
      const baseUrl = api.config.oas.baseUrl || (serverIp + ':' + serverPort)
      const basePath = api.config.servers.web.urlPathForActions || 'api'

      return [{
        url: `${scheme}://${baseUrl}/${basePath}`
      }]
    }

    return serverObjects
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathsObject
  _getPathsObject () {
    let pathsObject = {}
    const actions = api.actions.actions
    const verbs = api.routes.verbs

    if (api.config.servers.web.simpleRouting) {
      for (let actionName in actions) {
        for (let version in actions[actionName]) {
          const action = actions[actionName][version]
          const route = '/' + action.name

          const pathItemObject = this._getPathItemObject(route, action, verbs)

          pathsObject = { ...pathsObject, ...pathItemObject }
        }
      }
    }

    if (api.config.servers.web.queryRouting) {
      // '?action=:' + action.name
      const action = {
        name: 'actionHeroOasGenericActionForQueryRouting',
        version: 1,
        'in': 'query',
        inputs: {
          action: {
            type: 'string',
            required: true
          },
          apiVersion: {
            type: 'string',
            required: false
          }
        }
      }
      const route = '/'
      const pathItemObject = this._getPathItemObject(route, action, verbs)

      pathsObject = { ...pathsObject, ...pathItemObject }
    }

    for (let verb in api.config.routes) {
      const routes = api.config.routes[verb]

      for (let i in routes) {
        const route = routes[i]
        const actionByRoute = actions[route.action]

        for (let version in actionByRoute) {
          const action = actionByRoute[version]
          const v = verb.toLowerCase() === 'all' ? verbs : [verb]
          const pathItemObject = this._getPathItemObject(route.path, action, v)

          pathsObject = { ...pathsObject, ...pathItemObject }
        }
      }
    }

    return pathsObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathItemObject
  _getPathItemObject (route, action, verbs) {
    const pathItemObject = {}

    pathItemObject[route] = {}

    for (let i in verbs) {
      const verb = verbs[i]
      const operationObject = this._getOperationObject(action, verb, route)

      action.summary && (pathItemObject[route].summary = action.summary)
      action.description && (pathItemObject[route].description = action.description)
      pathItemObject[route][verb] = operationObject
    }

    return pathItemObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject
  _getOperationObject (action, verb, route) {
    const operationObject = {}
    const tags = []

    if (api.config.oas.groupByVersionTag) {
      tags.push(action.version.toString())
    }

    if (_.isArray(action.tags) && action.tags.lenght > 0) {
      tags.push(...action.tags)
    }

    if (tags.length > 0) {
      operationObject.tags = tags
    }

    operationObject.operationId = uuid.v4()
    operationObject.responses = this._getResponsesObject(action)

    // FIXME: Not all inputs may be in the request body.
    if (verb === 'post' || verb === 'put') {
      const requestBodyObject = this._getRequestBodyObject(action, route)

      requestBodyObject && (operationObject.requestBody = requestBodyObject)
    } else {
      const parameterObjects = this._getParameterObjects(action, route)

      parameterObjects && (operationObject.parameters = parameterObjects)
    }

    // FIXME: Remove this from here, read this from the action itself.
    // Consider using _getSecurityRequirementObjects and send it the action?
    operationObject.security = this._openApiDocument.security

    return operationObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#responsesObject
  _getResponsesObject (action) {
    const defaultSchemas = {
      // As this is required by the OAS, in case a response schema is not
      // specified on an action, return this basic schema.
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#responseObject
      '200': {
        description: 'OK.'
      }
    }

    return action.responseSchemas || defaultSchemas
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#requestBodyObject
  _getRequestBodyObject (action, route) {
    const requestBodyObject = {}
    const componentName = `${action.name}_${action.version}`
    let referenceObject = this._getReferenceObject('requestBodies', componentName)

    if (referenceObject) {
      return referenceObject
    }

    requestBodyObject.content = this._getMediaTypeObjects(action, route)

    referenceObject = this._getReferenceObject('requestBodies', componentName, requestBodyObject)

    return referenceObject
  }

  _getMediaTypeObjects (action, route) {
    const mediaTypeObjects = []
    const mediaTypes = ['application/json'] // TODO: Read from somewhere else?
    const mediaTypeObject = this._getMediaTypeObject(action, route)

    for (let i in mediaTypes) {
      const mediaType = mediaTypes[i]

      mediaTypeObjects.push({
        [mediaType]: mediaTypeObject
      })
    }

    return mediaTypeObjects
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#mediaTypeObject
  _getMediaTypeObject (action, route) {
    const mediaTypeObject = {}
    const schemaObject = this._getSchemaObject(action.inputs, route)

    schemaObject && (mediaTypeObject.schema = schemaObject)

    return mediaTypeObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
  _getParameterObjects (action, route) {
    if (!action.inputs) {
      return null
    }

    const parameterObjects = []

    for (let name in action.inputs) {
      const input = action.inputs[name]
      const parameterObject = this._getParameterObject(action, input, name, route)

      parameterObjects.push(parameterObject)
    }

    return parameterObjects
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
  _getParameterObject (action, input, name, route) {
    const parameterObject = {}
    const style = input.style || action.style
    const componentName = `${action.name}_${action.version}_${name}`
    let referenceObject = this._getReferenceObject('parameter', componentName)

    if (referenceObject) {
      return referenceObject
    }

    parameterObject.name = name
    parameterObject.in = this._getParameterIn(input, action.in, route)
    input.description && (parameterObject.description = input.description)

    if (typeof input.required !== 'undefined') {
      parameterObject.required = input.required
    }

    parameterObject.schema = this._getSchemaObject({ [name]: input })[name]
    style && (parameterObject.style = style)

    referenceObject = this._getReferenceObject('parameter', componentName, parameterObject)

    return referenceObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterIn
  _getParameterIn (input, location, route) {
    // Possible values are "query", "header", "path" or "cookie".
    const parameterIn = input.in || location

    if (parameterIn) {
      return parameterIn
    }

    // FIXME: Check on route to get parameter type if not specified.
    return 'path'
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#schemaObject
  _getSchemaObject (inputs, route) {
    if (!inputs || typeof inputs !== 'object') {
      return null
    }

    const schemaObject = {}

    for (let inputName in inputs) {
      const input = inputs[inputName]

      // Invalid input object.
      if (typeof input !== 'object') {
        return null
      }

      // Deep copy as we mutate the object and also delete unwanted functions.
      schemaObject[inputName] = JSON.parse(JSON.stringify(input))

      if (!input.type) {
        schemaObject[inputName].type = 'string'
      }

      if (typeof input.required === 'undefined') {
        schemaObject[inputName].required = input.required
      }

      if (input.schema) {
        const inputSchema = this._getSchemaObject(input.schema, route)

        if (inputSchema) {
          const propertyName = input.type === 'array' ? 'items' : 'properties'
          schemaObject[inputName][propertyName] = inputSchema
        }

        delete schemaObject[inputName].schema
      }
    }

    return schemaObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#referenceObject
  _getReferenceObject (aspect, componentName, component = null) {
    const searchPath = `${aspect}.${componentName}`
    const exists = _.has(this._componentsObject, searchPath)

    if (!exists && !component) {
      return null
    }

    if (!exists) {
      _.set(this._componentsObject, searchPath, component)
    }

    return {
      '$ref': `#/components/${aspect}/${componentName}`
    }
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securityRequirementObject
  _getSecurityRequirementObjects () {
    const securityRequirementObjects = api.config.oas.security
    const hasInvalidSecurityRequirementsFromConfigFile = true // TODO: Add validations for this.

    if (hasInvalidSecurityRequirementsFromConfigFile) {
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#security-scheme-object
      return [{
        type: 'apiKey',
        name: 'Authorization',
        'in': 'header'
      }, {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }]
    }

    return securityRequirementObjects
  }

  _getTagObjects () {
    const tagObjects = []
    const tagsInfo = Object.assign({}, api.config.oas.tagsInfo)

    if (api.config.oas.groupByVersionTag) {
      // Get all versions available on the API.
      let versions = []
      const actions = api.actions.actions

      for (let actionName in actions) {
        for (let version in actions[actionName]) {
          versions.push(version)
        }
      }

      const uniqueVersions = _.uniq(versions)

      for (let i in uniqueVersions) {
        const version = uniqueVersions[i].toString()
        const description = _.get(tagsInfo, `${version}.description`)
        const externalDocs = _.get(tagsInfo, `${version}.externalDocs`)
        const tagObject = this._getTagObject(version, description, externalDocs)

        delete tagsInfo[version]

        tagObjects.push(tagObject)
      }
    }

    for (let tagName in tagsInfo) {
      const description = _.get(tagsInfo, `${tagName}.description`)
      const externalDocs = _.get(tagsInfo, `${tagName}.externalDocs`)
      const tagObject = this._getTagObject(tagName, description, externalDocs)

      tagObjects.push(tagObject)
    }

    if (tagObjects.length === 0) {
      return null
    } else {
      return tagObjects
    }
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#tagObject
  _getTagObject (name, description = null, externalDocumentationObject = null) {
    const tagObject = {}

    tagObject.name = name.toString()
    description && (tagObject.description = description)
    externalDocumentationObject && (tagObject.externalDocs = externalDocumentationObject)

    return tagObject
  }
}
