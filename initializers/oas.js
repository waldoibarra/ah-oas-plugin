'use strict'

const { Initializer, api } = require('actionhero')

const Oas = require('../classes/oas')

module.exports = class OasInitializer extends Initializer {
  constructor () {
    super()
    this.name = 'oas'
  }

  async initialize () {
    api.oas = new Oas()
  }

  async start () {
    api.oas.buildOpenApiDocument()
  }
}
