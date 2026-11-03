import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { latLngBounds } from "leaflet";
import type { TalhaoRecord } from "../types";
import { format } from "../lib/domain";
import { RiskBadge } from "./common";
import "leaflet/dist/leaflet.css";
export const riskColors = {
  Baixo: "#438565",
  Moderado: "#d5a44b",
  Alto: "#c2715a",
};
function Fit({ records }: { records: TalhaoRecord[] }) {
  const map = useMap();
  useEffect(() => {
    if (records.length)
      map.fitBounds(
        latLngBounds(records.map((r) => [r.latitude, r.longitude])),
        { padding: [35, 35], maxZoom: 9 },
      );
  }, [map, records]);
  return null;
}
export default function GeoMap({ records }: { records: TalhaoRecord[] }) {
  const [mode, setMode] = useState("risco");
  const [tileError, setTileError] = useState(false);
  return (
    <>
      <div className="map-toolbar">
        <span>
          <span className="dot" /> {records.length} localizações
        </span>
        <label>
          Colorir por{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="risco">Risco histórico</option>
            <option value="produtividade">Produtividade</option>
          </select>
        </label>
      </div>
      <div className="map-wrap">
        <MapContainer
          center={[-15.78, -47.92]}
          zoom={4}
          scrollWheelZoom={false}
          preferCanvas
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <Fit records={records} />
          {records.map((record) => (
            <CircleMarker
              key={record.talhao_id}
              center={[record.latitude, record.longitude]}
              radius={5}
              pathOptions={{
                color:
                  mode === "risco"
                    ? riskColors[record.risco_quebra]
                    : `hsl(${110 + (Math.min(record.produtividade_sc_ha, 120) / 120) * 50} 35% ${65 - (Math.min(record.produtividade_sc_ha, 120) / 120) * 35}%)`,
                weight: 1,
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>
                    {record.talhao_id} · {record.municipio}
                  </strong>
                  <p>
                    {record.cultura} · {format(record.area_hectares, 1)} ha
                  </p>
                  <p>
                    Chuva: {format(record.precipitacao_mm, 1)} mm
                    <br />
                    Produtividade: {format(record.produtividade_sc_ha, 1)} sc/ha
                  </p>
                  <RiskBadge risk={record.risco_quebra} />
                  <p>
                    {record.latitude}, {record.longitude}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="map-legend">
        {mode === "risco" ? (
          Object.entries(riskColors).map(([label, color]) => (
            <span key={label}>
              <i style={{ background: color }} />
              {label}
            </span>
          ))
        ) : (
          <span>Verde claro → verde escuro: 0–120 sc/ha</span>
        )}
        <small>Coordenadas informadas na base ativa</small>
      </div>
      {tileError && (
        <p className="footnote warning-text">
          O fundo do mapa não carregou. Confira a conexão; as coordenadas
          continuam disponíveis na tabela abaixo.
        </p>
      )}
    </>
  );
}
