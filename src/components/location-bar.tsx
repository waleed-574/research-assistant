"use client";

import { useState } from "react";
import type { UserLocation } from "@/mastra/schemas";
import { currencyForCountry, isEuCountry } from "@/mastra/tools/country-data";

/**
 * Shows the location that is being injected into both agents, and lets the user
 * correct it. Detection is IP-based, so an override matters for VPN users — and
 * the agents behave differently for a user in Germany vs. the US, so it has to
 * be visible rather than hidden request state.
 */

export function LocationBar({
  location,
  disabled,
  onChange,
}: {
  location: UserLocation | null;
  disabled?: boolean;
  onChange: (location: UserLocation) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!location) {
    return (
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Detecting your location…
      </p>
    );
  }

  const place = [location.city, location.country].filter(Boolean).join(", ");
  const detail = [
    location.currency,
    location.isEU ? "EU" : null,
    location.source === "user-override" ? "set by you" : null,
    location.source === "fallback" ? "not detected" : null,
  ].filter(Boolean);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span aria-hidden>◉</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {place || "Unknown location"}
        </span>
        {detail.length > 0 && <span>({detail.join(" · ")})</span>}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="underline decoration-dotted underline-offset-2 transition hover:text-zinc-900 disabled:opacity-40 dark:hover:text-zinc-100"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <LocationEditor
      location={location}
      onCancel={() => setEditing(false)}
      onSave={(next) => {
        setEditing(false);
        onChange(next);
      }}
    />
  );
}

function LocationEditor({
  location,
  onSave,
  onCancel,
}: {
  location: UserLocation;
  onSave: (location: UserLocation) => void;
  onCancel: () => void;
}) {
  const [country, setCountry] = useState(
    location.country === "Unknown" ? "" : location.country,
  );
  const [code, setCode] = useState(
    location.countryCode === "XX" ? "" : location.countryCode,
  );
  const [city, setCity] = useState(location.city ?? "");

  const trimmedCode = code.trim().toUpperCase();
  const canSave = country.trim().length > 1 && trimmedCode.length === 2;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...location,
      country: country.trim(),
      countryCode: trimmedCode,
      city: city.trim() || null,
      // Region belonged to the old place; keep it only if the country is unchanged.
      region: trimmedCode === location.countryCode ? location.region : null,
      currency: currencyForCountry(trimmedCode),
      isEU: isEuCountry(trimmedCode),
      source: "user-override",
    });
  };

  const inputClass =
    "rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="Country"
        aria-label="Country"
        className={`${inputClass} w-32`}
      />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.slice(0, 2))}
        placeholder="DE"
        aria-label="Two-letter country code"
        className={`${inputClass} w-14 uppercase`}
      />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City (optional)"
        aria-label="City"
        className={`${inputClass} w-32`}
      />
      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="rounded bg-zinc-900 px-2.5 py-1 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
      >
        Cancel
      </button>
    </div>
  );
}
