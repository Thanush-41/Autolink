from redis import Redis
from rq import Queue
from .config import settings

redis_conn = Redis.from_url(settings.redis_url)
content_queue = Queue("content", connection=redis_conn)
scheduler_queue = Queue("scheduler", connection=redis_conn)
engagement_queue = Queue("engagement", connection=redis_conn)
