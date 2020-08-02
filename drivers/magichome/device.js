'use strict';

const Homey = require('homey');
const { Control } = require('magic-home');
const { Discovery } = require('magic-home');
const discovery = new Discovery();
const tinycolor = require("tinycolor2");
const devices = {};
const options = { ack: Control.ackMask(0) };
var runningDiscovery = false;

class MagicHomeDevice extends Homey.Device {

  async onInit() {
    let id = this.getData().id;
    devices[id] = {};
    devices[id].data = this.getData();
    devices[id].light = new Control(this.getSetting('address'), options);

    this.setAvailable();
    this.pollDevice(id);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      let id = this.getData().id;

      if (value) {
        return devices[id].light.setPower(true);
      } else {
        return devices[id].light.setPower(false);
      }
    });

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], async (valueObj, optsObj) => {
      if (typeof valueObj.light_hue !== 'undefined') {
        var hue_value = valueObj.light_hue;
      } else {
        var hue_value = this.getCapabilityValue('light_hue');
      }

      if (typeof valueObj.light_saturation !== 'undefined') {
        var saturation_value = valueObj.light_saturation;
      } else {
        var saturation_value = this.getCapabilityValue('light_saturation');
      }

      let id = this.getData().id;
      let color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      let rgbcolor = color.toRgb();
      return devices[id].light.setColor(Number(rgbcolor.r),Number(rgbcolor.g),Number(rgbcolor.b));
    }, 500);

    this.registerCapabilityListener('dim', async (value) => {
      let id = this.getData().id;
      let hsv = tinycolor.fromRatio({h: this.getCapabilityValue('light_hue'), s: this.getCapabilityValue('light_saturation'), v: value});
      let rgb = hsv.toRgb();
      return devices[id].light.setColor(Number(rgb.r),Number(rgb.g),Number(rgb.b));
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      let id = this.getData().id;
      let level = Number(this.denormalize(value, 0, 255));
      return devices[id].light.setWarmWhite(level);
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(id) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {

      devices[id].light.queryState().then(result => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        let color = tinycolor({ r: result.color.red, g: result.color.green, b: result.color.blue });
        let hsv = color.toHsv();
        let hue = Number((hsv.h / 360).toFixed(2));
        let brightness = Number(hsv.v.toFixed(2));
        var state = result.on;

        // capability onoff
        if (state != this.getCapabilityValue('onoff')) {
          this.setCapabilityValue('onoff', state);
        }

        // capability dim
        if (brightness != this.getCapabilityValue('dim')) {
          this.setCapabilityValue('dim', brightness);
        }

        // capability light_hue
        if (hue != this.getCapabilityValue('light_hue')) {
          this.setCapabilityValue('light_hue', hue);
        }

        // capability light_saturation
        if (hsv.s != this.getCapabilityValue('light_saturation')) {
          this.setCapabilityValue('light_saturation', hsv.s);
        }

        // capability light_temperature
        if (this.hasCapability('light_temperature')) {
          let light_temperature = Number(this.normalize(result.warm_white, 0, 255));
          if (light_temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', light_temperature);
          }
        }

        // capability light_mode
        if (this.hasCapability('light_mode')) {
          if (result.mode === 'color') {
            var light_mode = 'color';
          } else {
            var light_mode = 'temperature';
          }
          if (light_mode != this.getCapabilityValue('light_mode')) {
            this.setCapabilityValue('light_mode', light_mode);
          }
        }
      })
      .catch((err) => {
        this.log(err);
        this.setUnavailable(this.homey.__('Unreachable'));
        this.pingDevice(id);
      });

    }, 10000);
  }

  pingDevice(id) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      devices[id].light.queryState().then(result => {
    	  this.setAvailable();
        this.pollDevice(id);
      })
      .catch((err) => {
        this.error(err);
        try {
          if (runningDiscovery == false) {
            runningDiscovery = true;
            discovery.scan(3000).then(result => {
              var magichomes = this.homey.drivers.getDriver('magichome').getDevices();
              for (let i in result) {
                Object.keys(magichomes).forEach(function(key) {
                  if (this.getData().id == result[i].id && this.getSetting('address') != result[i].address ) {
                    this.setSettings({address: result[i].address, model: result[i].model});
                    devices[this.getData().id].light = new Control(result[i].address, characteristics);
                  }
                });
              }
            })
            setTimeout(runningDiscovery = true, 4000);
          }
        } catch (error) {
          this.error(error);
        }
      });

    }, 63000);
  }

  normalize(value, min, max) {
  	var normalized = (value - min) / (max - min);
  	return Number(normalized.toFixed(2));
  }

  denormalize(normalized, min, max) {
  	var denormalized = ((1 - normalized) * (max - min) + min);
  	return Number(denormalized.toFixed(0));
  }

}

module.exports = MagicHomeDevice;
