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
    time.sleep(0.5)
    return "success"


@app.route("/set_led_positions", methods=["POST"])
def set_led_positions():
    data = request.json
    print("=" * 80)
    print("final LED Positions:")
    print(data)
    print("=" * 80)

    import matplotlib.pyplot as plt
    """
    it says
    server.py:40: UserWarning: Starting a Matplotlib GUI outside of the main thread will likely fail.
          fig = plt.figure()
    server.py:49: UserWarning: Starting a Matplotlib GUI outside of the main thread will likely fail.
          plt.show()
    But as of writing this comment/code, it works just fine.
    """
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    ax.scatter(
        [xyz[0] for i, xyz in data.items()],
        [xyz[1] for i, xyz in data.items()],
        [xyz[2] for i, xyz in data.items()],
    )
    # for index, xyz in data.items():
    #     ax.text(xyz[0], xyz[1], xyz[2], f"{index}", transform=plt.gca().transAxes)
    plt.show()
    return "success"
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port="8080")
