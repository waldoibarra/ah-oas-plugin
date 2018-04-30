'use strict'

const path = require('path')

const _ = require('lodash')
const { api } = require('actionhero')
const parseAuthor = require('parse-author')

const packageJson = require(api.projectRoot + path.sep + 'package.json')

module.exports = class Oas {
  constructor () {
    this._documentation = {}
  }

  getDocumentation () {
    return this._documentation
  }

  // https://swagger.io/specification/#oasObject
  buildDocumentation () {
    this._documentation = {}

    const servers = this._getServers()

    this._documentation.openapi = '3.0.1'
    this._documentation.info = this._getInfoObject()
    servers && (this._documentation.servers = servers)

    // TODO: Add logic for these if needed.
    this._documentation.paths = {}
    this._documentation.components = {}
    this._documentation.security = [{}]
    this._documentation.tags = [{}]
    this._documentation.externalDocs = {}
  }

  _getInfoObject () {
    const info = {}
    const contactObject = this._getContactObject()

    info.title = api.config.general.serverName || packageJson.name
    info.description = packageJson.description
    contactObject && (info.contact = contactObject)
    packageJson.license && (info.license = { name: packageJson.license })
    info.version = api.config.general.apiVersion || packageJson.version

    return info
  }

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

  _getServers () {
    const servers = api.config.oas.servers

    if (!servers ||
      !_.isArray(servers) ||
      servers.length === 0 ||
      _.every(servers, (s) => !s.url || typeof s.url !== 'string')
    ) {
      return null
    }

    return servers
  }
}
