"use strict";

const Homey = require('homey');

class MagicHomeApp extends Homey.App {

  onInit() {
    this.log('Initializing Magic Home app ...');
  }

}

module.exports = MagicHomeApp;
