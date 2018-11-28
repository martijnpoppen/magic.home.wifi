"use strict";

const Homey = require('homey');
const MagicHomeControl = require('magic-home').Control;
const tinycolor = require("tinycolor2");
const characteristics = {
	rgb_min_0: true,
	ww_min_0: true,
	set_color_magic_bytes: [0x00, 0x0f],
	wait_for_reply: false
}

class MagicHomeApp extends Homey.App {

  onInit() {
    this.log('Initializing Magic Home app ...');

    new Homey.FlowCardAction('colorAndWhite')
      .register()
      .registerRunListener((args, state) => {
        var light = new MagicHomeControl(args.device.getSetting('address'), characteristics);
        var hexcolor = tinycolor(args.color);
        var rgb = hexcolor.toRgb();

        light.setColorAndWarmWhite(rgb.r, rgb.g, rgb.b, Number(args.white), function(err, result) {
        	if (err) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        });
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('effect')
      .register()
      .registerRunListener((args, state) => {
        var light = new MagicHomeControl(args.device.getSetting('address'), characteristics);

        light.setPattern(args.effect, args.speed, function(err, result) {
        	if (err) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        });
        return Promise.resolve(true);
      })
  }

}

module.exports = MagicHomeApp;
