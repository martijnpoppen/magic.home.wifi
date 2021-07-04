"use strict";

const Homey = require('homey');
const { Discovery } = require('magic-home');
const discovery = new Discovery();

const typeCapabilityMap = {
  'AK001-ZJ100'     : [ 'onoff', 'dim', 'light_hue', 'light_saturation' ],
  'AK001-ZJ200'     : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'AK001-ZJ210'     : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'addressable' ],
  'AK001-ZJ2104'    : [ 'onoff', 'dim' ],
  'AK001-ZJ2145'    : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'AK001-ZJ2147'    : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'HF-LPB100'       : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'HF-LPB100-ZJ002' : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'HF-LPB100-ZJ200' : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ],
  'other'           : [ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ]
}

class MagicHomeDriver extends Homey.Driver {

  async onPairListDevices () {
    let devices = [];
    await discovery.scan(3000).then(result => {
      this.log(discovery.clients.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i));
      for (let i in discovery.clients.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)) {
        if (result[i].model == 'AK001-ZJ100') {
          var name = 'RGB controller '+ result[i].model +' ('+ result[i].address +')';
        } else if (result[i].model == 'AK001-ZJ200') {
          var name = 'RGBW controller '+ result[i].model +' ('+ result[i].address +')';
        } else if (result[i].model == 'AK001-ZJ210') {
          var name = 'RGB SPI addressable controller '+ result[i].model +' ('+ result[i].address +')';
        } else if (result[i].model == 'HF-LPB100' || result[i].model == 'HF-LPB100-ZJ002' || result[i].model == 'HF-LPB100-ZJ200' || result[i].model == 'AK001-ZJ2104' || result[i].model == 'AK001-ZJ2145' || result[i].model == 'AK001-ZJ2147') {
          var name = 'RGBWW controller '+ result[i].model +' ('+ result[i].address +')';
        } else {
          var name = result[i].model +' ('+ result[i].address +')';
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
    })
    .catch((err) => {
      return reject(err);
    });

    return devices;
  }

}

module.exports = MagicHomeDriver;
