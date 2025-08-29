FROM python:3.12-alpine AS app
RUN mkdir /app
WORKDIR  /app
ADD server.py /app
ADD parse_daily.py  /app
ADD stations.py  /app
ADD requirements.txt /app
RUN pip install -r requirements.txt && rm requirements.txt
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000" ]

