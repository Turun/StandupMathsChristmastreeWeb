from flask import Flask, render_template

app = Flask(__name__)
app.run(host="0.0.0.0", port="8080")


@app.route("/")
def html():
    return render_template("index.html")
