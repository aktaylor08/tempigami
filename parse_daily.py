#!/usr/bin/env python3
import requests
import datetime
import numpy as np
import pandas as pd

from calendar import monthrange


class Element:
    def __init__(self, code: str, name: str, fun=None) -> None:
        self.code = code
        self.name = name
        if fun:
            self.fun = np.vectorize(fun)
        else:
            self.fun = None

    def process_row(self, row):
        if self.fun:
            return self.fun(row)
        else:
            return row


ELEMENTS = [
    Element("TMAX", "Temp Max", fun=lambda x: np.round((x / 10.0) * (9.0 / 5.0) + 32)),
    Element("TMIN", "Temp Max", fun=lambda x: np.round((x / 10.0) * (9.0 / 5.0) + 32)),
    Element("PRCP", "Precipitation", fun=lambda x: x * 0.039),
    Element("SNWD", "Snow Depth", fun=lambda x: x * 0.039),
    Element("SNOW", "Snow", fun=lambda x: x * 0.039),
]

MAP = {x.code: (idx, x) for idx, x in enumerate(ELEMENTS)}


def parse_to_df(data):
    parsed_data = np.empty((0, len(ELEMENTS)))
    dates = []
    starts = {}
    for line in data:
        if len(line) < 1:
            continue
        year = int(line[11:15])
        month = int(line[15:17])
        size = monthrange(year, month)[1]
        if (year, month) in starts:
            row = starts[(year, month)]
        else:
            row = parsed_data.shape[0]
            new_month = np.empty((size, len(ELEMENTS)))
            new_month.fill(np.nan)
            parsed_data = np.append(parsed_data, new_month, axis=0)
            for x in range(size):
                dates.append(datetime.date(year, month, x + 1))
            starts[(year, month)] = row
        element = line[17:21]
        if element in MAP:
            col, thing = MAP[element]
            start_idx = 21
            data = []
            for _ in range(size):
                value = int(line[start_idx : start_idx + 5])
                mflag = line[start_idx + 5 : start_idx + 6]
                qflag = line[start_idx + 6 : start_idx + 7]
                sflag = line[start_idx + 7 : start_idx + 8]
                if mflag != " ":
                    pass
                    #print("MFLAG", value, mflag)
                if qflag != " " or value == -9999:
                    value = np.nan
                data.append(value)
                start_idx += 8
            parsed_data[row : row + size, col] = thing.process_row(np.array(data))
    return pd.DataFrame(
        data=parsed_data, index=dates, columns=[x.code for x in ELEMENTS]
    )


def get_stations_data(station):
    url = "https://www1.ncdc.noaa.gov/pub/data/ghcn/daily/all/" + station + ".dly"
    response = requests.get(url)
    return response.text.split("\n")
