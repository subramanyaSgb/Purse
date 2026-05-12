import { useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MapView } from '@/components/MapView';
import type { Place } from '@/domain/types';

export type PlaceFormValues = {
  name: string;
  lat: number;
  lng: number;
};

// Default: a sensible India-centred starting point (Bangalore, MG Road).
const DEFAULT_LAT = 12.9756;
const DEFAULT_LNG = 77.6066;

function initialValuesFor(p: Place | null): PlaceFormValues {
  if (!p) return { name: '', lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  return { name: p.name, lat: p.lat, lng: p.lng };
}

function PlaceFormBody({
  initial,
  onSave,
  onRemove,
  onClose,
}: {
  initial: Place | null;
  onSave: (v: PlaceFormValues) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<PlaceFormValues>(() => initialValuesFor(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device.');
      return;
    }
    setGpsLoading(true);
    setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setValues((v) => ({
              ...v,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }));
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      });
    } catch (e) {
      setError(
        e instanceof GeolocationPositionError || e instanceof Error
          ? e.message
          : 'Failed to read GPS',
      );
    } finally {
      setGpsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...values, name: values.name.trim() });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
      <div className="grid gap-2">
        <Label htmlFor="place-name">Name</Label>
        <Input
          id="place-name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Home, Office, Tirupati Temple"
          autoFocus
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Location</Label>
        <MapView
          lat={values.lat}
          lng={values.lng}
          onChange={(lat, lng) => setValues((v) => ({ ...v, lat, lng }))}
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {values.lat.toFixed(5)}, {values.lng.toFixed(5)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={useCurrentLocation}
            disabled={gpsLoading}
          >
            <MapPin className="mr-1 size-4" />
            {gpsLoading ? 'Reading…' : 'Use current GPS'}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <SheetFooter className="flex-col gap-2 sm:flex-row">
        {isEdit && onRemove ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onRemove();
              onClose();
            }}
            disabled={saving}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </Button>
      </SheetFooter>
    </form>
  );
}

export type PlaceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Place | null;
  onSave: (v: PlaceFormValues) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
};

export function PlaceForm({ open, onOpenChange, initial, onSave, onRemove }: PlaceFormProps) {
  const isEdit = !!initial;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit place' : 'New place'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Drag the pin or tap the map to fix the location.'
              : 'Use GPS or tap the map to pick a spot.'}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <PlaceFormBody
            key={initial?.id ?? 'new'}
            initial={initial ?? null}
            onSave={onSave}
            onRemove={onRemove}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
