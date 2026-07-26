import os
import sys
from redis import Redis
from rq import Connection, Worker
from rq.worker import SimpleWorker
from rq.timeouts import TimerDeathPenalty


def main() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    conn = Redis.from_url(redis_url)
    queue_names = ["content", "scheduler", "engagement"]

    # Windows has no os.fork() (needed by the default Worker) and no SIGALRM
    # (needed by the default death penalty). Use process-safe alternatives.
    if sys.platform == "win32":
        worker_cls = SimpleWorker
        SimpleWorker.death_penalty_class = TimerDeathPenalty
    else:
        worker_cls = Worker

    with Connection(conn):
        worker = worker_cls(queues=queue_names)
        worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
