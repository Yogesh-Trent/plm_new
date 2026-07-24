"use client";

import { useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";

// Reusable date / datetime picker: a styled trigger opens a custom month-grid
// calendar in a popover. Zero extra deps (Radix Popover only). The value is the
// same string the native inputs used — "YYYY-MM-DD" for date, "YYYY-MM-DDTHH:mm"
// for datetime — so call sites just swap <input type="date"> for <DatePicker>.

type Props = {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Parse the incoming value into date + time parts without timezone surprises.
function parse(value: string): { day: string; time: string } {
  if (!value) return { day: "", time: "" };
  const [day, rest] = value.split("T");
  return { day: day ?? "", time: rest ? rest.slice(0, 5) : "" };
}

function displayLabel(value: string, withTime: boolean, placeholder: string) {
  const { day, time } = parse(value);
  if (!day) return placeholder;
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return placeholder;
  const dateStr = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return withTime && time ? `${dateStr} · ${time}` : dateStr;
}

export function DatePicker({
  value,
  onChange,
  withTime = false,
  placeholder = "Select date…",
  disabled = false,
  id,
  ariaLabel,
}: Props) {
  const { day: selectedDay, time: selectedTime } = parse(value);
  const [open, setOpen] = useState(false);

  // The month currently shown in the grid (defaults to the selected month).
  const initialMonth = useMemo(() => {
    if (selectedDay) {
      const [y, m] = selectedDay.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [selectedDay]);
  const [view, setView] = useState(initialMonth);

  const grid = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first offset.
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: string; label: number } | null> = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: toDay(new Date(year, month, d)), label: d });
    }
    return cells;
  }, [view]);

  const todayStr = toDay(new Date());

  const pickDay = (day: string) => {
    const time = withTime ? selectedTime || "00:00" : "";
    onChange(withTime ? `${day}T${time}` : day);
    if (!withTime) setOpen(false);
  };

  const setTime = (time: string) => {
    const day = selectedDay || todayStr;
    onChange(`${day}T${time || "00:00"}`);
  };

  const clear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          className={`datepicker-trigger${selectedDay ? "" : " is-empty"}`}
        >
          <CalendarBlank size={16} />
          <span>{displayLabel(value, withTime, placeholder)}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="datepicker-pop"
          sideOffset={6}
          align="start"
        >
          <div className="datepicker-head">
            <button
              type="button"
              className="datepicker-nav"
              aria-label="Previous month"
              onClick={() =>
                setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
              }
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <strong>
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </strong>
            <button
              type="button"
              className="datepicker-nav"
              aria-label="Next month"
              onClick={() =>
                setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
              }
            >
              <CaretRight size={15} weight="bold" />
            </button>
          </div>

          <div className="datepicker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="datepicker-grid">
            {grid.map((cell, i) =>
              cell ? (
                <button
                  key={cell.day}
                  type="button"
                  className={`datepicker-day${
                    cell.day === selectedDay ? " is-selected" : ""
                  }${cell.day === todayStr ? " is-today" : ""}`}
                  onClick={() => pickDay(cell.day)}
                >
                  {cell.label}
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>

          {withTime && (
            <div className="datepicker-time">
              <label>
                <span>Time</span>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="datepicker-foot">
            <button type="button" className="datepicker-link" onClick={clear}>
              Clear
            </button>
            <button
              type="button"
              className="datepicker-link"
              onClick={() => {
                pickDay(todayStr);
                setView(new Date());
              }}
            >
              Today
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
