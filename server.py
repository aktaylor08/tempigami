from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from parse_daily import get_stations_data, parse_to_df
from stations import Station, get_station_info, search, check_cache, save_cache
import time
import json
import numpy as np
import re
import threading
import requests

version = ''


origins = [
    "http://localhost:80",  # React development server
    "http://localhost:3000",  # React development server
    "https://apps.aktcode.com",  # Your deployed frontend URL
]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow only specified origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.get('/api/tempgami/search')
def station_search(lon: float, lat: float, dist: float, wmo: bool, gsn: bool, hcncrn: bool, others: bool):
    rets = []
    for x in search(lon, lat, dist):
        if wmo and x.wmo:
            rets.append(x)
        elif gsn and x.gsn:
            rets.append(x)
        elif hcncrn and x.hcn_crn:
            rets.append(x)
        elif others:
            rets.append(x)
    return {"type": "FeatureCollection", "features": [x.to_geo_json() for x in rets]}

@app.get("/api/tempgami/{station}")
def get_data(station: str):
    time_key = version
    cache_val = check_cache(station, time_key)
    if not cache_val:
        data = get_stations_data(station)
        df = parse_to_df(data)
        start_date = None
        end_date = None
        min_t = int(df["TMIN"].min())
        max_t = int(df["TMAX"].max())
        grid = np.zeros(((max_t - min_t + 1, max_t - min_t + 1)))
        unique = 0
        last_10 = []
        firstlast = [
            [["", ""] for _ in range(max_t - min_t + 1)] for _ in range(max_t - min_t + 1)
        ]
        axis = np.linspace(min_t, max_t, endpoint=True, num=max_t - min_t + 1)
        count = 0
        for row in df.iterrows():
            if np.isnan(row[1]["TMIN"]) or np.isnan(row[1]["TMAX"]):
                continue
            if start_date is None:
                start_date = row[0]
            end_date = row[0]
            y_idx = int(row[1]["TMIN"] - min_t)
            x_idx = int(row[1]["TMAX"] - min_t)
            count += 1
            if grid[x_idx, y_idx] == 0:
                unique += 1
                firstlast[x_idx][y_idx][0] = row[0]
                firstlast[x_idx][y_idx][1] = row[0]
                last_10.append([row[0], row[1]["TMIN"], row[1]["TMAX"]])
                last_10 = last_10[-10:]
            else:
                firstlast[x_idx][y_idx][1] = row[0]

            grid[x_idx, y_idx] += 1
        last_10.reverse()

        ret = {
            "station": station,
            "grid": grid.tolist(),
            "temps": axis.tolist(),
            "firstlast": firstlast,
            "maxTemp": min_t,
            "minTemp": max_t,
            "unique": unique,
            "last10": last_10,
            "count": count,
            "startDate": start_date,
            "endDate": end_date,
            "stationInfo": get_station_info(station).model_dump()
        }

        save_cache(station, time_key, json.dumps(ret, default=str))
    else:
        ret = json.loads(cache_val)
    return ret

    # Defines a route handler for `/*` essentially.

def get_version():
    def runner():
        while True:
            global version
            resp = requests.get('https://www1.ncdc.noaa.gov/pub/data/ghcn/daily/ghcnd-version.txt')
            v = re.match('^The current version of GHCN Daily is (\\S+) \(.*', resp.text)
            if v:
                if v.group(1) != version:
                    version = v.group(1)
                    print("New version found", version)
            else:
                print("Bad match, no version found")
            time.sleep(5)
    thread = threading.Thread(target=runner)
    thread.start()
get_version()
