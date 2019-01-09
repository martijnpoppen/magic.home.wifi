"use strict";

const Homey = require('homey');
const MagicHomeDiscovery = require('magic-home').Discovery;
const discovery = new MagicHomeDiscovery();

const typeCapabilityMap = {
	'AK001-ZJ100' : [ 'onoff', 'dim', 'light_hue', 'light_saturation' ],
  'AK001-ZJ200' : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'other'       : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ]
}

class MagicHomeDriver extends Homey.Driver {

  onPairListDevices (data, callback) {
    discovery.scan(3000, function(err, result) {
      let devices = [];
      for (let i in result) {
        if (result[i].model == 'AK001-ZJ100') {
          var name = 'RGB controller ('+ result[i].address +')';
        } else if (result[i].model == 'AK001-ZJ200') {
          var name = 'RGBW controller ('+ result[i].address +')';
        } else {
          var name = 'RGBWW controller ('+ result[i].address +')';
          result[i].model = 'other';
        }

        devices.push({
          name: name,
          data: {
            id: result[i].id
          },
          settings: {
            address: result[i].address,
            model: result[i].model
          },
          capabilities: typeCapabilityMap[result[i].model],
        });
      }
      callback(null, devices);
    });

  }

}

module.exports = MagicHomeDriver;
