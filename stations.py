#!/usr/bin/env python
import shapely

from pydantic import BaseModel
import json
import redis


r = redis.Redis(host='localhost', port=6379, decode_responses=True)
class Station(BaseModel):
    id: str
    lon: float
    lat: float
    elevation: float
    state: str | None
    name: str
    gsn:  str | None
    hcn_crn: str | None 
    wmo: str | None 

    def to_geo_json(self):
        ret = {}
        geo = json.loads(shapely.to_geojson(shapely.Point(self.lon, self.lat)))
        ret['geometry'] = geo
        ret['properties'] = {
            "id": self.id,
            "elevation": self.elevation,
            "state": self.state,
            "name": self.name,
            "gsn": self.gsn,
            "hcn_crn": self.hcn_crn,
            "wmo": self.wmo
                
        }
        ret['type'] = 'Feature'
        return(ret)

    @classmethod
    def from_geojson(cls, geojson):
        geo = geojson['geometry']
        props = geojson['properties']
        return cls(id=props['id'], lon=geo['coordinates'][0], lat=geo['coordinates'][1], elevation=props.get("elevation", -1), state=props.get("state"), name=props.get("name"), gsn=props.get("gsn"),
            hcn_crn=props.get("hcn_crn"), wmo=props.get('wmo'))


def get_station_info(id: str) -> Station | None:
    info = r.get(f"station:info:{id}")
    if info:
        loaded = json.loads(info)
        return Station.from_geojson(loaded)
    return None

def search(lon, lat, dist, unit='m') -> list[Station]:
    res = r.geosearch("station:locations", unit=unit, radius=dist, longitude=lon, latitude=lat)
    result = [Station.from_geojson(json.loads(r.get(f"station:info:{x}"))) for x in res]
    return result



if __name__ == "__main__":
    stations = []

    with open("ghcnd-stations.txt") as f:
        for line in f:
            id = line[0:11]
            lat = float(line[11:20])
            lon = float(line[21:30])
            elevation = float(line[31:37])
            state = line[38:40].strip()
            if len(state) == 0:
                state = None
            name = line[41:71].strip()
            gsn = line[72:75].strip()
            if len(gsn) == 0:
                gsn = None
            hcn_crn = line[76:79].strip()
            if len(hcn_crn) == 0:
                hcn_crn= None
            wmo = line[80:85].strip()
            if len(wmo) == 0:
                wmo = None
            s = Station(id=id, lon=lon, lat=lat, elevation=elevation, state=state, name=name, gsn=gsn, hcn_crn=hcn_crn, wmo=wmo)
            if abs(lat) > 85:
                print(name, lon, lat)
            stations.append(s.to_geo_json())
            station_text = json.dumps(s.to_geo_json())
            try:
                r.set(f"station:info:{s.id}", station_text)
                r.geoadd("station:locations",(s.lon, s.lat, s.id))
            except:
                print("OOB station: ", station_text)


