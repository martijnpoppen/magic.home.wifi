'use strict';

const Homey = require('homey');
const { Control } = require('magic-home');
const { Discovery } = require('magic-home');
const discovery = new Discovery();
const tinycolor = require("tinycolor2");
const devices = {};
const options = { ack: Control.ackMask(0), connect_timeout: 8000 };
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
      return await devices[id].light.setPower(value);
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

      const id = this.getData().id;
      const color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      const rgbcolor = color.toRgb();
      return await devices[id].light.setColor(Number(rgbcolor.r),Number(rgbcolor.g),Number(rgbcolor.b));
    }, 500);

    this.registerCapabilityListener('dim', async (value) => {
      const id = this.getData().id;
      const hsv = tinycolor.fromRatio({h: this.getCapabilityValue('light_hue'), s: this.getCapabilityValue('light_saturation'), v: value});
      const rgb = hsv.toRgb();
      return await devices[id].light.setColor(Number(rgb.r),Number(rgb.g),Number(rgb.b));
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const id = this.getData().id;
      const level = Number(this.denormalize(value, 0, 255));
      return await devices[id].light.setWarmWhite(level);
    });

    this.registerCapabilityListener('light_mode', async (value) => {
      return;
    });

  }

  async onSettings({ newSettings }) {
    devices[id].light = new Control(newSettings.address, options);
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(id) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await devices[id].light.queryState();
        if (!this.getAvailable()) { this.setAvailable(); }

        let color = tinycolor({ r: result.color.red, g: result.color.green, b: result.color.blue });
        let hsv = color.toHsv();
        let hue = Number((hsv.h / 360).toFixed(2));
        let brightness = Number(hsv.v.toFixed(2));
        let state = result.on;

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

      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable')+ ': '+ error);
        this.pingDevice(id);
      }
    }, 10000);
  }

  pingDevice(id) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        devices[id].light = new Control(this.getSetting('address'), options);
        let result = await devices[id].light.queryState();
        this.setAvailable();
        this.pollDevice(id);
      } catch (error) {
        if (runningDiscovery == false) {
          runningDiscovery = true;
          const discover = await discovery.scan(3000);
          const magichomes = await this.homey.drivers.getDriver('magichome').getDevices();
          for (let i in discover) {
            Object.keys(magichomes).forEach(function(key) {
              if (this.getData().id == discover[i].id && this.getSetting('address') != discover[i].address ) {
                this.setSettings({address: discover[i].address, model: discover[i].model});
                devices[this.getData().id].light = new Control(discover[i].address, options);
              }
            });
          }
          setTimeout(() => { runningDiscovery = true }, 10000);
        }
      }
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
