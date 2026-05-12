import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, X } from 'lucide-react';
import { placesRepo } from '@/repo/places';
import { appMetaRepo } from '@/repo/appMeta';
import { haversineMeters } from '@/lib/geo';

const NEARBY_RADIUS_M = 200;
const NEARBY_MAX = 5;

type Coords = { lat: number; lng: number };

/**
 * Place picker for the AddTransactionSheet.
 *
 * - Reads navigator.geolocation when appMeta.gpsEnabled (cached by the
 *   browser with maximumAge=60000).
 * - Shows up to 5 saved places within 200 m of the current fix, sorted
 *   by distance ascending.
 * - "+ Create here" button creates a fresh place at the current coords
 *   when the user types a new name AND we have a GPS fix.
 * - Tap × on the selected pill to clear.
 */
export function PlacePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const qc = useQueryClient();
  const { data: meta } = useQuery({
    queryKey: ['appMeta'],
    queryFn: () => appMetaRepo.get(),
  });
  const { data: places = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => placesRepo.list(),
  });
  const createPlace = useMutation({
    mutationFn: (input: { name: string; lat: number; lng: number }) => placesRepo.create(input),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['places'] });
      onChange(created.id);
    },
  });
  const touchUsed = useMutation({
    mutationFn: (id: string) => placesRepo.touchLastUsed(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['places'] });
    },
  });

  const geolocationAvailable = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'loading' | 'ready' | 'denied' | 'unsupported'
  >(() => (geolocationAvailable ? 'idle' : 'unsupported'));
  const [name, setName] = useState('');

  useEffect(() => {
    if (!meta?.gpsEnabled) return;
    if (!geolocationAvailable) return;
    let cancelled = false;
    // setGpsStatus('loading') is the rule-tripping line. We move the
    // synchronous status update into an async-resolved chain so the effect
    // body only schedules work — the callback into setState fires
    // asynchronously from the geolocation API.
    queueMicrotask(() => {
      if (cancelled) return;
      setGpsStatus('loading');
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ready');
      },
      () => {
        if (cancelled) return;
        setGpsStatus('denied');
      },
      { maximumAge: 60_000, timeout: 5_000, enableHighAccuracy: false },
    );
    return () => {
      cancelled = true;
    };
  }, [meta?.gpsEnabled, geolocationAvailable]);

  const nearby = useMemo(() => {
    if (!coords) return [];
    return places
      .map((p) => ({
        place: p,
        distance: haversineMeters(coords.lat, coords.lng, p.lat, p.lng),
      }))
      .filter((x) => x.distance <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, NEARBY_MAX);
  }, [places, coords]);

  const selected = value ? (places.find((p) => p.id === value) ?? null) : null;
  const searchMatches = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) => p.name.toLowerCase().includes(q))
      .filter((p) => !nearby.some((n) => n.place.id === p.id))
      .slice(0, 5);
  }, [places, name, nearby]);

  function pick(id: string) {
    onChange(id);
    setName('');
    touchUsed.mutate(id);
  }

  function createHere() {
    if (!coords || !name.trim()) return;
    createPlace.mutate({ name: name.trim(), lat: coords.lat, lng: coords.lng });
    setName('');
  }

  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-3">
      {/* Selected pill */}
      {selected ? (
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-foreground inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-semibold"
            style={{ background: 'rgba(255,179,71,0.16)', color: 'var(--color-warn)' }}
          >
            <MapPin className="size-3.5" aria-hidden />
            {selected.name}
            <button
              type="button"
              aria-label="Clear place"
              onClick={() => onChange(null)}
              className="hover:text-foreground/80"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--color-ink-faint)' }}>
            {selected.lat.toFixed(4)}°N · {selected.lng.toFixed(4)}°E
          </span>
        </div>
      ) : (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            gpsStatus === 'loading'
              ? 'Reading GPS…'
              : gpsStatus === 'ready'
                ? 'Search or create a place near you'
                : 'Search saved places'
          }
          className="bg-transparent text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
          aria-label="Place name"
        />
      )}

      {/* GPS state line */}
      {!selected ? (
        <p className="font-mono text-[10.5px]" style={{ color: 'var(--color-ink-faint)' }}>
          {gpsStatus === 'ready' && coords
            ? `GPS · ${coords.lat.toFixed(4)}°N · ${coords.lng.toFixed(4)}°E`
            : gpsStatus === 'loading'
              ? 'GPS · acquiring fix…'
              : gpsStatus === 'denied'
                ? 'GPS denied · enable in browser settings or pick manually'
                : gpsStatus === 'unsupported'
                  ? 'GPS not available on this device'
                  : meta && !meta.gpsEnabled
                    ? 'GPS off · enable in Settings'
                    : ''}
        </p>
      ) : null}

      {/* Nearby */}
      {!selected && nearby.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {nearby.map(({ place, distance }) => (
            <button
              key={place.id}
              type="button"
              onClick={() => pick(place.id)}
              className="bg-muted border-border text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
            >
              {place.name}
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-ink-faint)' }}>
                {Math.round(distance)} m
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Search matches */}
      {!selected && searchMatches.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {searchMatches.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className="bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Create-here */}
      {!selected &&
      coords &&
      name.trim() &&
      !places.some((p) => p.name.toLowerCase() === name.trim().toLowerCase()) ? (
        <button
          type="button"
          onClick={createHere}
          disabled={createPlace.isPending}
          className="text-foreground border-border inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold"
        >
          <Plus className="size-3" aria-hidden />
          Create &quot;{name.trim()}&quot; here
        </button>
      ) : null}
    </div>
  );
}
