from flask import Flask, render_template, Response, request
from ledcontrol import LEDControl
from fakeledcontrol import FakeLEDControl
import time
import threading

# led_control = LEDControl()
led_control = FakeLEDControl()
app = Flask(__name__)

messages_outbox = []
is_started = False
kill_threads = False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/configure_leds", methods=["POST"])
def configure_leds():
    data = request.json
    led_control.update(data)
    led_control.redraw()
    import time
    time.sleep(1)
    return "success"


@app.route("/set_led_positions", methods=["POST"])
def set_led_positions():
    data = request.json
    print("=" * 80)
    print("final LED Positions:")
    print(data)
    print("=" * 80)

    # import matplotlib.pyplot as plt
    # plt.scatter(
    #     [xy[0] for i, xy in data.items()],
    #     [xy[1] for i, xy in data.items()],
    # )
    # for index, xy in data:
    #     plt.text(xy[0], xy[1], f"{index}", transform=plt.gca().transAxes)
    # plt.show()
    return "success"
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port="8080")
