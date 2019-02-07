# Use Homey to control LED strips through the Magic Home LED controller
This Homey app allows you to control LED strips through the Magic Home LED Controller WiFi.

## Supported devices
The Magic Home LED Controller WiFi is sold under many rebranded names and is also know as Flux-Led. The controller comes in (at least) 3 variants.
* RGB
* RGBW
* RGBW with IR receiver

The controller is also often used in complete WiFi LED strip kits sold on Aliexpress. Sold seperatly it should only cost about 7 to 8 US dollars. All these variants and rebranded controllers should be supported but the Homey app might need to be update to enable the correct capabilities (RGB or RGBW(W)) for your device. Please contact me through the support topic for these kind of updates.

## Instructions
Make sure your LED controller is connected to the same WiFi network as your Homey. Use the pair wizard to discover and pair your LED controller(s).

## Support topic
For support please use the official support topic on the forum [here](https://community.athom.com/t/1750).

## Changelog
### v1.1.3 - 2019-02-07
* FIX: code refactoring in driver (replace callbacks with promises)
