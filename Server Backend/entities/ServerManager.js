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
      this._players = new Array(4).fill(null)
      this._oldPlayerData = new Array(4).fill(null)
      this._currentlyConnectedClients = 0
      this._firstTurnSet = false
      this.init()
      this.listenForClients()
    }

    /**
     * Initializes player and game managers
     */
    init() {
      this.createGameManager()
    }

    /**
     * Listens to socket events that happen
     */
    listenForClients() {
      io.on('connection', socket => {
        if (this._currentlyConnectedClients !== 4) {
          socket.emit('whoAreYou')

          socket.on('whoAreYou', response => {
            this.determineClientType(socket, response)
          })
        } else {
          socket.emit('errorMessage', {
            error: 'There are already 4 players connected to the game.'
          })
        }
      })
    }

    removePlayer(player) {
      for (let p of this._players) {
        if (p === player) {
          this.io.emit('gameEvent', {
            action: `${player.name} has left the game.`
          })
          console.log('Client has disconnected.')
          let pos = p.position
          this.addOldData(pos, p)
          this._players.splice(pos, 1, null)
          this._currentlyConnectedClients--
          this._frontendManager.askForAI(pos)
        }
      }
    }

    addOldData(pos, p) {
      this._oldPlayerData.splice(pos, 1, {
        tiles: p.tiles,
        isTurn: p.isTurn,
        score: p.score
      })
    }

    /**
     * Creates only one frontend manager instance
     * @param {Object} socket - socket object
     */
    createFrontendManager(socket) {
      // TODO: check to see if we need to make sure only one frontend is connected? @Landon
      console.log('Server Frontend Connected')
      this._frontendManager = new FrontendManager(socket)
    }

    /**
     * Creates only one game manager instance
     */
    createGameManager() {
      if (this._gameManager === null) {
        this._gameManager = new GameManager(io)
      }
    }

    /**
     * Determines what kind of client has connected to the server
     * @param {Object} socket - socket object
     * @param {*} response - the type of the player
     */
    determineClientType(socket, response) {
      if (response.tisAI) {
        this.createPlayerManager('ai_test', 'team_test', true, socket)
      } else if (response.isSF) {
        this.createFrontendManager(socket)
      } else if (response.isClient) {
        this.createPlayerManager('client_test', 'team_test', false, socket)
      }
    }

    /**
     * Creates a player manager for a connected player
     * @param {String} name - name of the player
     * @param {String} team - player team
     * @param {Boolean} ai - is ai
     * @param {Object} socket - socket object
     */
    createPlayerManager(name, team, ai, socket) {
      for (let i = 0; i < this._players.length; i++) {
        let p = this._players[i]
        if (p === null) {
          console.log('Client connected')
          let player = new PlayerManager(i, 'Player #' + i, team, ai, socket, this._gameManager, this)
          if (!this._firstTurnSet) {
            player.isTurn = true
            this._firstTurnSet = true
          }
          if (this._oldPlayerData[i] !== null) {
            this.injectOldData(i, player)
          }
          this._players.splice(i, 1, player)
          break
        }
      }
    }

    /**
     * Position of the player whos turn it just was
     * @param {Number} pos - position
     */
    changeTurn(pos) {
      if (pos > 3) {
        pos = 0
      }
      this._players[pos].isTurn = true

      for (let p in this._players) {
        p.socket.emit('newTurn', {
          isTurn: p.isTurn
        })
        if (p.isTurn) {
          io.emit('gameEvent', {
            action: `It is now ${p.name}'s turn.`
          })
        }
      }
    }

    /**
     * Injects old data from a past connected player into a new player manager
     * @param {Number} pos - position of the player
     * @param {PlayerManager} p - manager
     */
    injectOldData(pos, p) {
      let old = this._oldPlayerData[pos]
      p.addPositionDetails(old.tiles, old.isTurn, old.score)
      this._oldPlayerData.splice(pos, 1, null)
    }
  }

  return ServerManager
}