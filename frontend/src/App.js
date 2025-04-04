import React, { useState, useEffect } from 'react';
import "./App.css";
import Plot from "react-plotly.js";
import axios from "axios";

let colorscale = [
    [0, "rgba(0,0,0,0)"],
    [0.001, "rgba(0,0,0,0)"],
    [0.002, 'rgb(31,120,180)'], [0.45, 'rgb(178,223,138)'], [0.65, 'rgb(51,160,44)'], [0.85, 'rgb(251,154,153)'], [1, 'rgb(227,26,28)']
];


function Controls({ station, setStation }) {
  const [inputValue, setInputValue] = useState(station);
  const handleUpdate = () => {
    console.log("Button hit " + inputValue)
    setStation(inputValue);
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
function App() {
  const [station, setStation]= useState("USW00014942")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  console.log("app " + station);

  useEffect(() => {
    axios
      .get("http://localhost:8000/tempgami/" + station)
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
      <Controls station={station} setStation={setStation}/>
        <p>{error}</p>
      </div>
    )

  } else if(data === null){
      <div>
      <Controls station={station} setStation={setStation}/>
      </div>

  } else {
    const gridData = data['grid'];
    const temps = data['temps']
    return (
      <div>
      <Controls station={station} setStation={setStation}/>
        <Plot data={[{ z: gridData, x: temps, y: temps, type: 'heatmap', colorscale: colorscale, hovertemplate: "Min Temp %{x} <br> Max Temp %{y} Count %{z}" }]} layout={{ xaxis: { title: "hi" }, width: 900, height: 800, }} />
      </div>
    )
  }
}


export default App;

