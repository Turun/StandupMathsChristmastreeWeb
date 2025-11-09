This project will recreate the following project of Standup maths:

https://www.youtube.com/watch?v=TvlpIojusBE


The software architecture consists of several parts:
- On the Pi we need some way to control the LED Strip. This is done with the rpi_ws281x library: https://github.com/rpi-ws281x/rpi-ws281x-python
- Also on the Pi we will run a server so that we can control the LEDs from an external device, like a phone. Probably with Flask. The external device will bring the camera with which we can detect the led positions
- finally we need a website to run on the external device which provides the ui

There are also python bindings for rust available for the rpi_ws281x library, so we could also use rust to write the webserver. This would make it easier to write multi threaded code, if we need to do such a thing.

One significant challenge will be detecting the position of the LEDs


ADDENDUM: It might be hard to figure out where exactly each LED is located, but that's not the thing we are interested in, is it? If the LED has a strong reflection (diffuse, e.g. because of a nearby wall) it is fair to say that the location should be considered the wall and not the actual position of the LED.
This can be expanded: We don't want to know the position of each led, we want to know how each LED influences each voxel of space. A diffuse influence is expected and can be used for even greater works!!!
