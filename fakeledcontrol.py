import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from multiprocessing import Process, Queue
import queue as queue_module
import time
import numpy as np
import random


class FakeLED:
    def __init__(self, index):
        self.x = index % 10
        self.y = index // 10
        self.is_on = True


class FakeLEDControl:
    """
    A multiprocessing-safe LED controller.
    The plot runs in a separate process, and we communicate
    via a Queue. The external interface (init, update, redraw)
    is unchanged.
    """

    def __init__(self):
        self.leds = [FakeLED(i) for i in range(100)]

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
            self.leds[int(index)].is_on = on

    def redraw(self):
        """Push the current LED state to the plotting process."""
        point_coords = [(fl.x, fl.y) for fl in self.leds]
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
        fig, ax = plt.subplots()
        ax.set_xlim(-1, 10)
        ax.set_ylim(-1, 10)
        fig.patch.set_facecolor('black')
        ax.set_facecolor('black')

        sizes = np.random.uniform(100, 100, size=100)
        point_coords, points_active = q.get_nowait()
        xs, ys = zip(*point_coords)
        sc = ax.scatter(xs, ys, color="white", s=sizes)

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
