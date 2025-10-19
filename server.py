from flask import Flask, render_template, Response
import time
import threading

app = Flask(__name__)

messages_outbox = []
is_started = False
kill_threads = False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/start")
def start():
    """
    This method is called by the client when the camera is set up. It is the go
    signal to trigger the LEDs one at a time and tell the client about it.
    """
    global is_started
    global kill_threads
    if is_started:
        kill_threads = True
        return {"status": "failed"}
    is_started = True
    threading.Thread(target=background_thread, daemon=True).start()
    return {"status": "success"}


@app.route("/events")
def events():
    """
    When the client fetches this endpoint, it will basically subscribe to
    receiving all future messages.

    The method itself continually loops over the messages_outbox, sends any
    messages it finds and then removes the message from the list.
    """
    def stream():
        try:
            while True:
                if messages_outbox:
                    msg = messages_outbox.pop(0)
                    yield f"data: {msg}\n\n"
                time.sleep(0.1)
        except GeneratorExit:
            return
    return Response(stream(), mimetype="text/event-stream")


def background_thread():
    """
    This is the thread that is started when the Client tells the server that
    everything is set up
    """
    global is_started
    for i in range(100):
        if kill_threads:
            break
        print(f"turning on LED {i}")
        messages_outbox.append(i)
        time.sleep(0.1)
    messages_outbox.append("Done")
    is_started = False


if __name__ == "__main__":
    app.run(host="0.0.0.0", port="8080")
