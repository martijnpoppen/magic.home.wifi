'use strict';

const Homey = require('homey');
const { sleep } = require('../../lib/helpers');
const tinycolor = require("tinycolor2");
const { Control, Discovery } = require('magic-home');
const discovery = new Discovery();

const devices = {};
const options = { ack: Control.ackMask(0), connect_timeout: 8000 };
let runningDiscovery = false;


class MagicHomeDevice extends Homey.Device {

  async onInit() {
    this.homey.app.log('[Device] - init =>', this.getName());
    this.setUnavailable(`Initializing ${this.getName()}`);

    await this.checkCapabilities();
    await this.setCapabilityListeners();

    let id = this.getData().id;
    devices[id] = {};
    devices[id].data = this.getData();
    devices[id].light = new Control(this.getSetting('address'), options);

    this.retreivePollValues(id);
    this.pollDevice(id, 'onInit');
  }

  async onDeleted() {
    clearInterval(this.pollingInterval);
  }

  async onSettings({ newSettings }) {
    const id = this.getData().id;
    devices[id].light = new Control(newSettings.address, options);
  }

  async setCapabilityListeners() {
    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      let id = this.getData().id;
      return await devices[id].light.setPower(value);
    });
  
    if(this.hasCapability('light_hue') || this.hasCapability('light_saturation')) {
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], async (valueObj, optsObj) => {
        const id = this.getData().id;
        this.resetPoll();
        
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
        
        await this.setColor(hue_value, saturation_value);
        
        if(this.hasCapability('light_temperature') && this.getSetting('RGB_W') === false) {
          await devices[id].light.setWarmWhite(0);
        }
      }, 500);
    }
  
    if(this.hasCapability('dim')) {
        this.registerCapabilityListener('dim', async (value) => {
            this.resetPoll();

            const hue = this.getCapabilityValue('light_hue');
            const saturation = this.getCapabilityValue('light_saturation')
            
            this.setColor(hue, saturation, value);
        });
    }
  
    if(this.hasCapability('light_temperature')) {
      this.registerCapabilityListener('light_temperature', async (value) => {
        this.resetPoll();

        const id = this.getData().id;
        const level = Number(this.denormalize(value, 0, 255));

        this.homey.app.log(`[Device] - ${this.getName()} - light_temperature`, value, level);
        
        await devices[id].light.setWarmWhite(level);

        if((this.hasCapability('light_hue') || this.hasCapability('light_saturation')) && this.getSetting('RGB_W') === false) {
          this.setColor(0, 0, 0);
        }

        return this.pollDevice(id, 'light_temperature');
      });
    }

    if(this.hasCapability('light_mode')) {
      this.registerCapabilityListener('light_mode', async (value) => {
          return;
      });
    }
  }

  async checkCapabilities() {
      const driverManifest = this.driver.manifest;
      const driverCapabilities = driverManifest.capabilities;
      
      const deviceCapabilities = this.getCapabilities();

      this.homey.app.log(`[Device] ${this.getName()} - Found capabilities =>`, deviceCapabilities);
      this.homey.app.log(`[Device] ${this.getName()} - Driver capabilities =>`, driverCapabilities);
      
      if(deviceCapabilities.length !== driverCapabilities.length) {      
          await this.updateCapabilities(driverCapabilities, deviceCapabilities);
      }

      return deviceCapabilities;
  }

  async updateCapabilities(driverCapabilities, deviceCapabilities) {
      this.homey.app.log(`[Device] ${this.getName()} - Add new capabilities =>`, driverCapabilities);
      try {
          deviceCapabilities.forEach(c => {
              this.addCapability(c);
          });
          await sleep(2000);
          driverCapabilities.forEach(c => {
              this.addCapability(c);
          });
          await sleep(2000);
      } catch (error) {
          this.homey.app.log(error)
      }
  }

  async setColor(light_hue = undefined, light_saturation = undefined, dim = undefined) {
    const id = this.getData().id;

    if (dim === undefined) dim = this.getCapabilityValue('dim');
    if (light_hue === undefined) light_hue = this.getCapabilityValue('light_hue');
    if (light_saturation === undefined) light_saturation = this.getCapabilityValue('light_saturation');

    const color = tinycolor.fromRatio({ h: light_hue, s: light_saturation, v: dim });
    const rgbcolor = color.toRgb();

    await devices[id].light.setColor(Number(rgbcolor.r),Number(rgbcolor.g),Number(rgbcolor.b));
    return this.pollDevice(id, 'setColor');
  }
  
  resetPoll() {
    this.homey.app.log(`[Device] - ${this.getName()} - resetPoll`);
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  async pollDevice(id, source = '') {
    this.homey.app.log(`[Device] - ${this.getName()} - pollDevice`, source);
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
        await this.retreivePollValues(id);
    }, 15000);
  }

  async retreivePollValues(id) {
    try {
        let result = await devices[id].light.queryState();
        this.homey.app.log(`[Device] - ${this.getName()} - polling`, result);

        let color = tinycolor({ r: result.color.red, g: result.color.green, b: result.color.blue });
        let hsv = color.toHsv();
        let hue = Number((hsv.h / 360).toFixed(2));
        let brightness = Number(hsv.v.toFixed(2));
        let state = result.on;

        // capability onoff
        if (state != this.getCapabilityValue('onoff')) {
            this.homey.app.log(`[Device] - ${this.getName()} - polling - set onoff`);
            this.setCapabilityValue('onoff', state);
        }

        // capability dim
        if (brightness != this.getCapabilityValue('dim')) {
            this.homey.app.log(`[Device] - ${this.getName()} - polling - set dim`);
            this.setCapabilityValue('dim', brightness);
        }

        // capability light_hue
        if (hue != this.getCapabilityValue('light_hue')) {
            this.homey.app.log(`[Device] - ${this.getName()} - polling - set light_hue`);
            this.setCapabilityValue('light_hue', hue);
        }

        // capability light_saturation
        if (hsv.s != this.getCapabilityValue('light_saturation')) {
            this.homey.app.log(`[Device] - ${this.getName()} - polling - set light_saturation`);
            this.setCapabilityValue('light_saturation', hsv.s);
        }

        // capability light_temperature
        if (this.hasCapability('light_temperature')) {
            let light_temperature = Number(this.normalize(result.warm_white, 0, 255));
            if (light_temperature != this.getCapabilityValue('light_temperature')) {
                this.homey.app.log(`[Device] - ${this.getName()} - polling - set light_temperature`);
                this.setCapabilityValue('light_temperature', light_temperature);
            }
        }

            // capability light_mode
        if (this.hasCapability('light_mode')) {
            if (result.mode === 'temperature') {
                var light_mode = 'temperature';
            } else {
                var light_mode = 'color';
            }

            if (light_mode != this.getCapabilityValue('light_mode')) {
                this.homey.app.log(`[Device] - ${this.getName()} - polling - set light_mode`, light_mode);
                
                // Disable light_mode. It switches inputs when not expected.
                // this.setCapabilityValue('light_mode', light_mode);
            }
        }


        if (!this.getAvailable()) { 
            this.setAvailable(); 
        }
    } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable')+ ': '+ error);
        this.pingDevice(id);
    }
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
        
        clearInterval(this.pollingInterval);

        this.pollDevice(id, 'pingInterval');
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
  	var normalized = (max - value) / (max - min);
  	return Number(normalized.toFixed(2));
  }

  denormalize(normalized, min, max) {
  	var denormalized = ((1 - normalized) * (max - min) + min);
  	return Number(denormalized.toFixed(0));
  }
}

module.exports = MagicHomeDevice;