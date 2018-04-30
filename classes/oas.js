'use strict'

const path = require('path')

const _ = require('lodash')
const { api } = require('actionhero')
const parseAuthor = require('parse-author')

const packageJson = require(api.projectRoot + path.sep + 'package.json')

module.exports = class Oas {
  constructor () {
    this._documentation = {}
    this._components = null
  }

  getDocumentation () {
    return this._documentation
  }

  // https://swagger.io/specification/
  buildDocumentation () {
    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#oasObject
    const documentationObject = {}

    this._components = null

    documentationObject.openapi = '3.0.1'
    documentationObject.info = this._getInfoObject()

    const serverObjects = this._getServerObjects()
    serverObjects && (documentationObject.servers = serverObjects)

    documentationObject.paths = this._getPathsObject()

    // TODO: Add logic for these.
    // documentationObject.security = [{}]
    // documentationObject.tags = [{}]
    // documentationObject.externalDocs = {}

    this._components && (documentationObject.components = this._components)

    this._documentation = documentationObject
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
    const servers = api.config.oas.servers
    const hasInvalidServersFromConfigFile = !servers ||
      !_.isArray(servers) ||
      servers.length === 0 ||
      _.some(servers, (s) => !s.url || typeof s.url !== 'string')

    if (hasInvalidServersFromConfigFile) {
      const scheme = api.config.servers.web.secure ? 'https' : 'http'
      const serverIp = api.utils.getExternalIPAddress()
      const serverPort = api.config.servers.web.port
      const baseUrl = api.config.oas.baseUrl || (serverIp + serverPort)
      const basePath = api.config.servers.web.urlPathForActions || 'api'

      return [{
        url: `${scheme}://${baseUrl}/${basePath}`
      }]
    }

    return servers
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#pathsObject
  _getPathsObject () {
    let pathsObject = {}
    const actions = api.actions.actions
    const verbs = api.routes.verbs

    for (let actionName in actions) {
      for (let version in actions[actionName]) {
        const action = actions[actionName][version]
        const route = '/' + action.name

        const pathItemObject = this._getPathItemObject(route, action, verbs)

        pathsObject = { ...pathsObject, ...pathItemObject }
      }
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
    const tags = null // TODO: Construct tags array.

    pathItemObject[route] = {}

    for (let i in verbs) {
      const verb = verbs[i]
      const operationObject = this._getOperationObject(action, tags)
      const parameterObjects = this._getParameterObjects(action, route)

      action.summary && (pathItemObject[route].summary = action.summary)
      action.description && (pathItemObject[route].description = action.description)
      pathItemObject[route][verb] = operationObject
      parameterObjects && (pathItemObject[route].parameters = parameterObjects)
    }

    return pathItemObject
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject
  _getOperationObject (action, tags) {
    const operationObject = {}

    tags && _.isArray(tags) && tags.length > 0 && (operationObject.tags = tags)
    operationObject.operationId = action.name // FIXME: This is supposed to be unique.
    operationObject.responses = this._getResponsesObject(action)
    // operationObject.security = [{}]

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

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
  _getParameterObjects (action, route) {
    if (!action.inputs) {
      return null
    }

    const parameterObjects = []

    for (let name in action.inputs) {
      const input = action.inputs[name]
      const parameterObject = this._getParameterObject(action, input, name, route)
      const referenceObject = this._getReferenceObject('parameter', action, parameterObject, name)

      parameterObjects.push(referenceObject)
    }

    return parameterObjects
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject
  _getParameterObject (action, input, name, route) {
    const parameterObject = {}
    const style = input.style || action.style

    // TODO: Add body (POST/PUT) params to Request Body Object on Components Object.
    parameterObject.name = name
    parameterObject.in = this._getParamType(input, action.in, route)
    input.description && (parameterObject.description = input.description)
    input.required && (parameterObject.required = input.required)
    parameterObject.schema = input.schema || { type: 'string' }
    style && (parameterObject.style = style)

    return parameterObject
  }

  _getParamType (input, location, route) {
    const paramType = input.paramType || location

    if (paramType) {
      return paramType
    }

    // TODO: Check on route to get parameter type if not specified.
    return 'path' // 'path' or 'query'?
  }

  // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#referenceObject
  _getReferenceObject (aspect, action, component, name) {
    const componentName = `${action.name}_${action.version}_${name}`
    const searchPath = `${aspect}.${componentName}`
    const exists = _.get(this._components, searchPath)

    if (!exists) {
      this._components || (this._components = {})
      this._components[aspect] || (this._components[aspect] = {})
      this._components[aspect][componentName] = component
    }

    return {
      '$ref': `#/components/${aspect}/${componentName}`
    }
  }
}
