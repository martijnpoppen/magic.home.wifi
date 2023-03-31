const { CustomMode } = require('../magic-home');
const tinycolor = require("tinycolor2");

// ---------------------------------------INIT FUNCTION----------------------------------------------------------

exports.init = async function (homey) {
    try {
        homey.flow.getActionCard('colorAndWhite')
        .registerRunListener(async (args) => {
            const deviceObject = args.device.getData();
            const id = deviceObject && deviceObject.id
            const devices = args.device.getDevices();
            const light = devices[id].light

            var hexcolor = tinycolor(args.color);
            var rgb = hexcolor.toRgb();

            return light.setColorAndWarmWhite(rgb.r, rgb.g, rgb.b, Number(args.white));
        })

        homey.flow.getActionCard('effect')
        .registerRunListener(async (args) => {
            const deviceObject = args.device.getData();
            const id = deviceObject && deviceObject.id
            const devices = args.device.getDevices();
            const light = devices[id].light

            return light.setPattern(args.effect, args.speed);
        })

        homey.flow.getActionCard('addressableEffect')
        .registerRunListener(async (args) => {
            const deviceObject = args.device.getData();
            const id = deviceObject && deviceObject.id
            const devices = args.device.getDevices();
            const light = devices[id].light

            return light.setIAPattern(args.effect, args.speed);
        })

        homey.flow.getActionCard('customeffect')
        .registerRunListener(async (args) => {
            const deviceObject = args.device.getData();
            const id = deviceObject && deviceObject.id
            const devices = args.device.getDevices();
            const light = devices[id].light

            let customeffect = new CustomMode();

            let hexcolor1 = tinycolor(args.color1);
            let hexcolor2 = tinycolor(args.color2);
            let hexcolor3 = tinycolor(args.color3);
            let hexcolor4 = tinycolor(args.color4);
            let rgb1 = hexcolor1.toRgb();
            let rgb2 = hexcolor2.toRgb();
            let rgb3 = hexcolor3.toRgb();
            let rgb4 = hexcolor4.toRgb();

            customeffect
            .addColor(rgb1.r, rgb1.g, rgb1.b)
            .addColor(rgb2.r, rgb2.g, rgb2.b);
            if (Number(args.colors) > 2) {
            customeffect.addColor(rgb3.r, rgb3.g, rgb3.b);
            }
            if (Number(args.colors) > 3) {
            customeffect.addColor(rgb4.r, rgb4.g, rgb4.b);
            }
            customeffect.setTransitionType(args.transition);
            return light.setCustomPattern(customeffect, args.speed);
        })
    } catch (err) {
        Homey.app.error(err);
    }
  }   
  
  
  // ---------------------------------------END OF FILE----------------------------------------------------------