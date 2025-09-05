import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./App.css";
import Plot from "react-plotly.js";
import axios from "axios";
import { Circle, GeoJSON, Marker, Popup, MapContainer, TileLayer, useMapEvents} from 'react-leaflet'



let colorscale = [
    [0, "rgba(0,0,0,0)"],
    [0.001, "rgba(0,0,0,0)"],
    [0.002, 'rgb(31,120,180)'], [0.45, 'rgb(178,223,138)'], [0.65, 'rgb(51,160,44)'], [0.85, 'rgb(251,154,153)'], [1, 'rgb(227,26,28)']
];

function Controls({ station }) {
    const nav = useNavigate()
  const [inputValue, setInputValue] = useState(station);
  const handleUpdate = () => {
        nav("/" + inputValue)
  };
  return(
    <div>
      Station from <a href="https://www1.ncdc.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt">Station List: </a>
   <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter station here"
      />
      <button onClick={handleUpdate}>Update Requested Station</button>
    </div>
  )
}


function CircleDrawer({doSearch, circle, setCircle, setSearchResults}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const startLatLng = useRef(null);
  useMapEvents({
	click(e){
		if(!isDrawing){
		  startLatLng.current = e.latlng;
          setSearchResults(null);
		  setCircle({ center: e.latlng, radius: 0 });
		  setIsDrawing(true);
		}else{
		  // Finalize circle
		  setIsDrawing(false);
          const distance = e.latlng.distanceTo(startLatLng.current);
          doSearch(startLatLng.current.lng, startLatLng.current.lat, distance);
		  startLatLng.current = null;	
		}
	},
    mousemove(e) {
      // Update radius while holding
      if (isDrawing && startLatLng.current) {
        const distance = e.latlng.distanceTo(startLatLng.current);
        setCircle({
         center: startLatLng.current,
          radius: distance,
        });
      }
    },
  });

  return circle ? (
    <Circle center={circle.center} radius={circle.radius} pathOptions={{ color: "blue" }} />
  ) : null;
}


function CurrentStation({station_info}){
    return station_info ? 
    <Marker position={[station_info.lat, station_info.lon]}>
    <Popup>
     {station_info.name}
    </Popup>
    </Marker> : null;
}


function Stations({searchResults,  setSearchResults}){
    const nav = useNavigate()
    const create = (name, id) => {
        let div = document.createElement('div')
        let p = document.createElement('p')
        p.textContent= name + " " + id;
        div.appendChild(p)
        let _button = document.createElement("button");
        _button.data = "hi";
        _button.innerHTML = 'Use this station';
        _button.onclick = function()
        {
                    setSearchResults(null);
                    nav("/" + id)

        }
        div.appendChild(_button);
        return div;

    }
    const onEachFeature = (feature, layer) => {
            if (feature.properties && feature.properties.name) {
                    layer.bindPopup(create(feature.properties.name, feature.properties.id))
                }
    }
    if(searchResults != null){
        return <GeoJSON data={searchResults} onEachFeature={onEachFeature} />
    }else{
        return null;
    }

}

function Checkbox({label, value, setValue}){
return (
<label>
<input type="checkbox" checked={value} onChange={() => {setValue(!value)}}/>
            {label}
</label>
)
}


function SimpleMap({station_info}) {
      const mapRef = useRef(null);
      const latitude = 0.0;
      const longitude = 0.0;
      const [searchResults, setSearchResults]= useState(null)
      const [wmoSearch, setWmoSearch] = useState(true)
      const [gsnSearch, setGsnSearch] = useState(false)
      const [hcncrnSearch, setHcncrnSearch] = useState(false)
      const [othersSearch, setOthersSearch] = useState(false)
      const [circle, setCircle] = useState(null);
      const doSearch = (lon, lat, dist) =>{
            axios
              .get("http://localhost:8000/api/tempgami/search?lon=" + lon + "&lat=" + lat + "&dist=" + dist + "&wmo=" + wmoSearch + "&gsn=" + gsnSearch + "&hcncrn=" + hcncrnSearch + "&others=" +othersSearch)
              .then((response) => {
                setSearchResults(response.data);
                setCircle(null);
              })
              .catch((error) => {
                setSearchResults(null);
              });

       }
      return ( 
            // Make sure you set the height and width of the map container otherwise the map won't show
        <div>
       <MapContainer center={[latitude, longitude]} zoom={2} ref={mapRef} style={{height: "600px", width: "800px"}}>
      <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    <CircleDrawer doSearch={doSearch} circle={circle} setCircle={setCircle} setSearchResults={setSearchResults}/>
    <Stations searchResults={searchResults} setSearchResults={setSearchResults}/>
	<CurrentStation station_info={station_info}/>
      </MapContainer>
    <Checkbox label="WMO" value={wmoSearch} setValue={setWmoSearch}/>
    <Checkbox label="GSN" value={gsnSearch} setValue={setGsnSearch}/>
    <Checkbox label="Hcn Rcn" value={hcncrnSearch} setValue={setHcncrnSearch}/>
    <Checkbox label="All Others" value={othersSearch} setValue={setOthersSearch}/>
    </div>
      )
    }



function Info({ station_info, unique, last10, total, start,end}) {
  return (<div>
    <h1>{station_info.name} - {station_info.id} </h1>
    <h2>{start}   ->    {end}</h2>
    <h2>{unique} unique temperature combinations</h2>
    <h2>{total} Days | {total / 365.0} years  </h2>
    <h2> Lon: {station_info.lon} Lat: {station_info.lat}</h2>
    <h2>10 most recent tempgamis</h2>
    <table>
      <tr>
      <th>Low</th>
      <th>High</th>
      <th>Date</th>
      </tr>
      {
        last10.map((item, index) => (
          <tr key={index}> <td>{item[1]}</td> <td>{item[2]}</td> <td>{item[0]}</td> </tr>

        ))}
      </table>

  </div>)
}
 


function App() {
  const station =  useLocation().pathname.substring(1);
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/tempgami/" + station)
      .then((response) => {
        setData(response.data);
        setError(null);
        setLoading(false);
      })
      .catch((error) => {
        setData(null);
        setError(error.message);
        setLoading(false);
      });
  }, [station]);
  if (error != null) {
    return(
      <div>
      <Controls key={station} station={station} />
      <SimpleMap station_info={null}  />
        <p>{error}</p>
      </div>
    )

  } else if(data === null){
      <div>
      <Controls station={station}/>
      <SimpleMap station_info={null}  />
      </div>

  } else {
    const gridData = data['grid'];
    const temps = data['temps']
    const custom = data['firstlast']
    const  unique = data['unique']
    const last10 = data['last10']
    const total = data['count']
    const station_info = data['stationInfo']
    const sd = data['startDate']
    const ed = data['endDate']
    return (
      <div>
      <Controls station={station} />
      <Plot data={[{ z: gridData, x: temps, y: temps, customdata: custom, type: 'heatmap', colorscale: colorscale, hovertemplate: "<extra></extra>Min Temp %{x} <br> Max Temp %{y} <br> Count %{z} <br> First %{customdata[0]} <br> Last: %{customdata[1]}" }]} layout={{ xaxis: { title: "hi" }, width: 800, height: 800, }} />
      <Info station_info={station_info} unique={unique} last10={last10} total={total} start={sd} end={ed}/>
      <SimpleMap station_info={station_info}  />
      </div>
    )
  }
}


export default App;

