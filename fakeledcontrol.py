import matplotlib.pyplot as plt
from matplotlib.widgets import Button
from matplotlib.animation import FuncAnimation
from multiprocessing import Process, Queue
import queue as queue_module
import time
import numpy as np
import random

random.seed(123)


class FakeLED:
    def __init__(self, index):
        self.x = random.random()
        self.y = random.random()
        self.z = random.random()
        self.is_on = True


class FakeLEDControl:
    """
    A multiprocessing-safe LED controller.
    The plot runs in a separate process, and we communicate
    via a Queue. The external interface (init, update, redraw)
    is unchanged.
    """

    def __init__(self):
        self.leds = [FakeLED(i) for i in range(20)]

        # Create a multiprocessing Queue for communication
        self.queue = Queue()

        # Launch the plot process
        self.plot_process = Process(target=self._run_plot_process, args=(self.queue,), daemon=True)
        self.redraw()
        self.plot_process.start()

    def update(self, data: dict[int, bool]):
        """Update LED state locally and send to plot process."""
        print(f"updating leds to: {data}")
        for index, on in data.items():
            try:
                self.leds[int(index)].is_on = on
            except IndexError:
                # if the frontend tries to control more LEDs, just don't do
                # anything. It's how the final product will work anyway.
                pass

    def redraw(self):
        """Push the current LED state to the plotting process."""
        point_coords = [(fl.x, fl.y, fl.z) for fl in self.leds]
        active_points = [fl.is_on for fl in self.leds]
        # Non-blocking send (in case the queue is full)
        try:
            self.queue.put_nowait((point_coords, active_points))
        except queue_module.Full:
            pass

    @staticmethod
    def _run_plot_process(q: Queue):
        """Run the Matplotlib plot in a separate process."""
        plt.ion()
        fig = plt.figure()
        ax = fig.add_subplot(111, projection='3d')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_zlim(0, 1)
        ax.xaxis.pane.fill = False
        ax.yaxis.pane.fill = False
        ax.zaxis.pane.fill = False
        ax.xaxis.pane.set_edgecolor("black")
        ax.yaxis.pane.set_edgecolor("black")
        ax.zaxis.pane.set_edgecolor("black")
        ax.grid(False)
        # ax.set_frame_on(False)
        fig.patch.set_facecolor('black')
        ax.set_facecolor('black')

        
        # --- Button callbacks ---
        def align_x(event):
            # Elevation 0°, azimuth 0° → looking along +X
            ax.view_init(elev=0, azim=0)
            plt.draw()

        def align_y(event):
            # Elevation 0°, azimuth 90° → looking along +Y
            ax.view_init(elev=0, azim=90)
            plt.draw()

        # --- Add buttons to the figure ---
        # Adjust these positions to taste (x, y, width, height)
        ax_button_x = plt.axes([0.8, 0.05, 0.08, 0.05])
        ax_button_y = plt.axes([0.9, 0.05, 0.08, 0.05])

        btn_x = Button(ax_button_x, 'Align X')
        btn_y = Button(ax_button_y, 'Align Y')

        btn_x.on_clicked(align_x)
        btn_y.on_clicked(align_y)

        point_coords, points_active = q.get_nowait()
        xs, ys, zs = zip(*point_coords)
        sc = ax.scatter(xs, ys, zs, color="white", s=10, depthshade=False)

        def update_plot(_):
            try:
                # Try to get the latest LED positions without blocking
                points_active = None
                while True:
                    _, points_active = q.get_nowait()
            except queue_module.Empty:
                pass

            if points_active:
                colors = ["white" if p else "black" for p in points_active]
                sc.set_color(colors)
            return sc,

        _ = FuncAnimation(fig, update_plot, interval=100, cache_frame_data=False)
        plt.show(block=True)


if __name__ == "__main__":
    flc = FakeLEDControl()

    # Simulate updates
    while True:
        time.sleep(1)
        flc.update({random.randint(0, 99): random.random() < 0.5})
        flc.redraw()
