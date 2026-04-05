'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { JournalEntry } from '@/lib/types'

interface Props {
  entries: JournalEntry[]
}

interface MarkerData {
  latitude: number
  longitude: number
  label?: string
  entryIds: string[]
  titles: string[]
  dates: Date[]
}

function BoundsController({ markers }: { markers: MarkerData[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) return
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 13)
      return
    }
    const L = require('leaflet')
    const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]))
    map.fitBounds(bounds, { padding: [32, 32] })
  }, [map, markers])

  return null
}

export default function LocationMap({ entries }: Props) {
  const withLocation = entries.filter((e) => e.location)

  // 同一座標のエントリをグループ化（小数点3桁でキー）
  const grouped = new Map<string, MarkerData>()
  for (const entry of withLocation) {
    const loc = entry.location!
    const key = `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: loc.label,
        entryIds: [],
        titles: [],
        dates: [],
      })
    }
    const group = grouped.get(key)!
    group.entryIds.push(entry.id)
    group.titles.push(entry.title)
    group.dates.push(new Date(entry.createdAt))
  }

  const markers = Array.from(grouped.values())
  const center: [number, number] = markers.length > 0
    ? [markers[0].latitude, markers[0].longitude]
    : [35.6812, 139.7671] // 東京デフォルト

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', background: '#18181b' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      <BoundsController markers={markers} />
      {markers.map((marker, i) => {
        const radius = Math.min(marker.entryIds.length * 4 + 4, 20)
        return (
          <CircleMarker
            key={i}
            center={[marker.latitude, marker.longitude]}
            radius={radius}
            pathOptions={{
              fillColor: '#8B5CF6',
              fillOpacity: 0.85,
              color: '#6D28D9',
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#e4e4e7', background: 'transparent' }}>
                {marker.label && (
                  <p style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}>{marker.label}</p>
                )}
                {marker.titles.map((title, j) => (
                  <div key={j} style={{ marginBottom: j < marker.titles.length - 1 ? '6px' : 0 }}>
                    <p style={{ fontWeight: 600, marginBottom: '2px' }}>{title}</p>
                    <p style={{ color: '#71717a', fontSize: '11px' }}>
                      {marker.dates[j].toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
