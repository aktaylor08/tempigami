FROM node AS nodebuild
ADD frontend/ /tmp/frontend
WORKDIR /tmp/frontend
RUN npm install && npm run build
FROM python:3.12-alpine AS app
RUN mkdir /app
WORKDIR  /app
COPY --from=nodebuild /tmp/frontend/build /app/frontend/build
ADD server.py /app
ADD parse_daily.py  /app
ADD requirements.txt /app
RUN pip install -r requirements.txt && rm requirements.txt
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000" ]

