'use strict';

const Homey = require('homey');
const { Control } = require('magic-home');
const tinycolor = require("tinycolor2");
const devices = {};
const characteristics = {
	rgb_min_0: true,
	ww_min_0: true,
	set_color_magic_bytes: [0x00, 0x0f],
	wait_for_reply: false
}

class MagicHomeDevice extends Homey.Device {

  onInit() {
    let id = this.getData().id;
    devices[id] = {};
    devices[id].data = this.getData();
    devices[id].light = new Control(this.getSetting('address'), characteristics);

    this.pollDevice(id);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      let id = this.getData().id;

      if (value) {
        return devices[id].light.setPower(true);
      } else {
        return devices[id].light.setPower(false);
      }
    });

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], ( valueObj, optsObj ) => {
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

    this.registerCapabilityListener('dim', (value, opts) => {
      let id = this.getData().id;
      let hsv = tinycolor.fromRatio({h: this.getCapabilityValue('light_hue'), s: this.getCapabilityValue('light_saturation'), v: value});
      let rgb = hsv.toRgb();
      return devices[id].light.setColor(Number(rgb.r),Number(rgb.g),Number(rgb.b));
    });

    this.registerCapabilityListener('light_temperature', (value, opts) => {
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

    let device = Homey.ManagerDrivers.getDriver('magichome').getDevice(devices[id].data);

    this.pollingInterval = setInterval(() => {

      devices[id].light.queryState().then(result => {
        let color = tinycolor({ r: result.color.red, g: result.color.green, b: result.color.blue });
        let hsv = color.toHsv();
        let hue = Number((hsv.h / 360).toFixed(2));
        let brightness = Number(hsv.v.toFixed(2));
        let light_temperature = Number(this.normalize(result.warm_white, 0, 255));

        var state = result.on;
        if (result.mode === 'color') {
          var light_mode = 'color';
        } else {
          var light_mode = 'temperature';
        }

        // capability onoff
        if (state != device.getCapabilityValue('onoff')) {
          device.setCapabilityValue('onoff', state);
        }

        // capability dim
        if (brightness != device.getCapabilityValue('dim')) {
          device.setCapabilityValue('dim', brightness);
        }

        // capability light_hue
        if (hue != device.getCapabilityValue('light_hue')) {
          device.setCapabilityValue('light_hue', hue);
        }

        // capability light_saturation
        if (hsv.s != device.getCapabilityValue('light_saturation')) {
          device.setCapabilityValue('light_saturation', hsv.s);
        }

        // capability light_temperature
        if (light_temperature != device.getCapabilityValue('light_temperature')) {
          device.setCapabilityValue('light_temperature', light_temperature);
        }

        // capability light_mode
        if (light_mode != device.getCapabilityValue('light_mode')) {
          device.setCapabilityValue('light_mode', light_mode);
        }
      })
      .catch((err) => {
        this.log(err);
        device.setUnavailable(Homey.__('Unreachable'));
        this.pingDevice(id);
      });

    }, 10000);
  }

  pingDevice(id) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    let device = Homey.ManagerDrivers.getDriver('magichome').getDevice(devices[id].data);

    this.pingInterval = setInterval(() => {
      devices[id].light.queryState().then(result => {
    	  device.setAvailable();
        this.pollDevice(id);
      })
      .catch((err) => {
        this.log(err);
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
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
