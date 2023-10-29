'use strict';

const Homey = require('homey');
const { Discovery } = require('../../lib/magic-home');
const discovery = new Discovery();
const { typeCapabilityMap } = require('../../constants');

class MagicHomeDriver extends Homey.Driver {
    async onPairListDevices() {
        let devices = [];
        await discovery
            .scan(5000)
            .then((result) => {
                this.homey.app.log(`[Driver] - Discovery =>`, result);

                for (let i in discovery.clients) {
                    if (!result[i].model) {
                        result[i].model = 'other';
                    }

                    var name = 'Magic Home Wifi Led ' + result[i].model + ' (' + result[i].address + ')';

                    devices.push({
                        name: name,
                        data: {
                            id: result[i].id
                        },
                        settings: {
                            address: result[i].address,
                            model: result[i].model
                        },
                        capabilities: typeCapabilityMap[result[i].model]
                    });
                }
            })
            .catch((err) => {
                this.homey.app.log(`[Driver] - Discovery err =>`, err);
                return reject(err);
            });

        return devices;
    }
}

module.exports = MagicHomeDriver;
