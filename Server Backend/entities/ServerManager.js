'use strict'
/**
 * Imports the GameManager, PlayerManager, and FrontendManager classes
 */
const GameManager = require('./GameManager')
const PlayerManager = require('./PlayerManager')
const FrontendManager = require('./FrontendManager')

module.exports = function(io) {
  class ServerManager {
    constructor() {
      this._gameManager = null
      this._frontendManager = null
      this._players = []
      this.init()
      this.listenForClients()
    }

    /**
     * Initializes player and game managers
     */
    init() {
      this.createPlayerManagers()
      this.createGameManager()
    }

    /**
     * Listens to socket events that happen
     */
    listenForClients() {
      io.on('connection', socket => {
        socket.emit('whoAreYou')

        socket.on('whoAreYou', response => {
          this.determineClientType(socket, response)
        })

        socket.on('disconnect', () => {
          if (this._frontendManager !== null) {
            let playerPosition = this.findWhichPlayerLeft(socket)
            this._frontendManager.askForAI(playerPosition)
          }
        })
      })
    }

    /**
     * Finds which player has disconnected from the game based on their socket
     * @param {Object} socket - socket object
     */
    findWhichPlayerLeft(socket) {
      for (let p of this._players) {
        if (p.socket === socket) {
          return p.position
        }
      }
    }

    /**
     * Creates 4 player managers
     */
    createPlayerManagers() {
      for (let i = 0; i < 4; i++) {
        this._players.push(new PlayerManager(i))
      }
    }

    /**
     * Creates only one frontend manager instance
     * @param {Object} socket - socket object
     */
    createFrontendManager(socket) {
      if (this._frontendManager === null) {
        this._frontendManager = new FrontendManager(socket)
      }
    }

    /**
     * Creates only one game manager instance
     */
    createGameManager() {
      if (this._gameManager === null) {
        this._gameManager = new GameManager()
      }
    }

    /**
     * Determines what kind of client has connected to the server
     * @param {Object} socket - socket object
     * @param {*} response - the type of the player
     */
    determineClientType(socket, response) {
      if (response.isAI) {
        console.log('AI Connected')
        this.updatePlayerManager('ai_test', true, socket, 'team_test')
      } else if (response.isSF) {
        console.log('Server Frontend Connected')
        this.createFrontendManager(socket)
      } else if (response.isClient) {
        console.log('Client Connected')
        this.updatePlayerManager('client_test', false, socket, 'team_test')
      }
    }

    /**
     * Once a player has connected, we update the player manager with their info
     * @param {String} name - name of the user
     * @param {Boolean} ai - is this an AI player
     * @param {Object} socket - socket object
     * @param {String} team - team the player is on
     */
    updatePlayerManager(name, ai, socket, team) {
      for (let p of this._players) {
        if (!p.filled) {
          p.addPlayerDetails(name, ai, socket, team)
          break
        }
      }
    }
  }

  return ServerManager
}