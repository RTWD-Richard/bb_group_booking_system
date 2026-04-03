'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRoomColor } from '@/lib/roomColors';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarProps {
  bookings: any[];
  rooms: any[];
  guests?: any[]; // Guest data for displaying names
  compact?: boolean; // For dashboard view
}

export default function Calendar({ bookings, rooms, guests = [], compact = false }: CalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigation
  function goToday() {
    setCurrentDate(new Date());
  }

  function goNext() {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }

  function goPrev() {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }

  // Get dates to display based on view mode
  function getDisplayDates(): Date[] {
    const dates: Date[] = [];
    
    if (viewMode === 'day') {
      dates.push(new Date(currentDate));
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      // Start on Monday (getDay() returns 0-6, where 0 is Sunday)
      const day = currentDate.getDay();
      const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
      startOfWeek.setDate(currentDate.getDate() + diff);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
    } else {
      // Month view
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Start from Monday before first day
      const startDate = new Date(firstDay);
      const firstDayOfWeek = firstDay.getDay();
      const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
      startDate.setDate(firstDay.getDate() - daysFromMonday);
      
      // End on Sunday after last day
      const endDate = new Date(lastDay);
      const lastDayOfWeek = lastDay.getDay();
      const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
      endDate.setDate(lastDay.getDate() + daysToSunday);
      
      let current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  }

  // Get guest name
  function getGuestName(guestId: string | null): string {
    if (!guestId) return 'Guest';
    const guest = guests.find(g => g.id === guestId);
    return guest ? guest.name : 'Guest';
  }

  // Calculate total nights
  function calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Format date header
  function formatDateHeader(date: Date): string {
    if (viewMode === 'day') {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric' });
    }
  }

  // Get current period label
  function getPeriodLabel(): string {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    } else if (viewMode === 'week') {
      const dates = getDisplayDates();
      const start = dates[0].toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      const end = dates[6].toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
  }

  const displayDates = getDisplayDates();
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
          >
            ← Prev
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
          >
            Today
          </button>
          <button
            onClick={goNext}
            className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
          >
            Next →
          </button>
        </div>

        <div className="text-lg font-semibold text-slate-900">
          {getPeriodLabel()}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'day' ? 'bg-white shadow' : 'hover:bg-slate-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'week' ? 'bg-white shadow' : 'hover:bg-slate-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'month' ? 'bg-white shadow' : 'hover:bg-slate-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="grid border-b-2 border-slate-300" 
                 style={{ gridTemplateColumns: `120px repeat(${displayDates.length}, minmax(${viewMode === 'month' ? '80px' : '120px'}, 1fr))` }}>
              <div className="p-2 border-r border-slate-200 font-semibold text-slate-700 text-sm">
                Rooms
              </div>
              {displayDates.map((date, i) => (
                <div 
                  key={i} 
                  className={`p-2 text-center text-sm ${
                    i < displayDates.length - 1 ? 'border-r border-slate-200' : ''
                  } ${isToday(date) ? 'bg-blue-50 font-semibold text-blue-900' : 'text-slate-700'}`}
                >
                  {formatDateHeader(date)}
                </div>
              ))}
            </div>

            {/* Room Rows */}
            {rooms.map((room, roomIndex) => {
              const roomColor = getRoomColor(room.name);
              const roomBookings = bookings.filter(b => b.roomId === room.id);
              
              return (
                <div 
                  key={room.id}
                  className={`grid relative ${roomIndex < rooms.length - 1 ? 'border-b border-slate-200' : ''}`}
                  style={{ 
                    gridTemplateColumns: `120px repeat(${displayDates.length}, minmax(${viewMode === 'month' ? '80px' : '120px'}, 1fr))`,
                    gridTemplateRows: 'auto'
                  }}
                >
                  {/* Room Name */}
                  <div className={`p-2 border-r border-slate-200 font-medium text-sm ${roomColor.text} ${roomColor.bg} row-start-1 col-start-1`}>
                    {room.name}
                  </div>

                  {/* Date Cells (background) */}
                  {displayDates.map((date, dateIndex) => {
                    return (
                      <div 
                        key={`cell-${dateIndex}`}
                        className={`p-1 min-h-[60px] row-start-1 ${
                          dateIndex < displayDates.length - 1 ? 'border-r border-slate-200' : ''
                        } ${isToday(date) ? 'bg-blue-50' : 'bg-white'}`}
                        style={{ gridColumn: dateIndex + 2 }}
                      />
                    );
                  })}

                  {/* Booking Bars (grid items) */}
                  {roomBookings.map((booking, bookingIdx) => {
                    const checkIn = new Date(booking.checkIn);
                    checkIn.setHours(0, 0, 0, 0);
                    const checkOut = new Date(booking.checkOut);
                    checkOut.setHours(0, 0, 0, 0);
                    
                    // Find start and end indices in the current view
                    let startIndex = -1;
                    let endIndex = -1;
                    
                    displayDates.forEach((d, idx) => {
                      const compareDate = new Date(d);
                      compareDate.setHours(0, 0, 0, 0);
                      
                      if (compareDate.getTime() === checkIn.getTime()) {
                        startIndex = idx;
                      }
                      if (compareDate.getTime() === checkOut.getTime()) {
                        endIndex = idx;
                      }
                    });
                    
                    // Skip if booking not visible in current view
                    if (startIndex === -1 && endIndex === -1) return null;
                    
                    // Clip to visible range
                    if (startIndex === -1) startIndex = 0;
                    if (endIndex === -1) endIndex = displayDates.length - 1;
                    
                    const guestName = getGuestName(booking.guestId);
                    const secondGuestName = booking.secondGuestId ? getGuestName(booking.secondGuestId) : null;
                    const nights = calculateNights(booking.checkIn, booking.checkOut);
                    
                    const visibleCheckIn = new Date(displayDates[startIndex]);
                    visibleCheckIn.setHours(0, 0, 0, 0);
                    const visibleCheckOut = new Date(displayDates[endIndex]);
                    visibleCheckOut.setHours(0, 0, 0, 0);
                    
                    const isCheckInDay = checkIn.getTime() === visibleCheckIn.getTime();
                    const isCheckOutDay = checkOut.getTime() === visibleCheckOut.getTime();
                    
                    const tooltipText = [
                      guestName,
                      secondGuestName ? `+ ${secondGuestName}` : null,
                      `Room: ${room.name}`,
                      `${nights} night${nights !== 1 ? 's' : ''}`,
                      `${booking.occupancyType} occupancy`,
                      `Check-in: ${new Date(booking.checkIn).toLocaleDateString()} (afternoon)`,
                      `Check-out: ${new Date(booking.checkOut).toLocaleDateString()} (morning)`,
                    ].filter(Boolean).join('\n');
                    
                    // Grid column positions (add 2 to account for room name column)
                    const gridColStart = startIndex + 2;
                    const gridColEnd = endIndex + 3; // +2 for room column, +1 for end
                    
                    // Calculate margins based on booking position
                    // Margins are relative to the total span, so we need to calculate
                    // 0.5 columns as a percentage of total columns spanned
                    const columnsSpanned = endIndex - startIndex + 1;
                    const halfColumnPercent = (0.5 / columnsSpanned) * 100;
                    
                    let marginLeft = '0';
                    let marginRight = '0';
                    
                    if (isCheckInDay) {
                      marginLeft = `${halfColumnPercent}%`;
                    }
                    if (isCheckOutDay) {
                      marginRight = `${halfColumnPercent}%`;
                    }
                    
                    return (
                      <div
                        key={`booking-${booking.id}`}
                        className="relative row-start-1"
                        style={{
                          gridColumn: `${gridColStart} / ${gridColEnd}`,
                          zIndex: 10,
                          pointerEvents: 'none',
                        }}
                      >
                        <Link
                          href={`/groups/${booking.groupId}`}
                          className={`block text-xs p-1 rounded border ${roomColor.bg} ${roomColor.border} ${roomColor.text} hover:opacity-90 transition-opacity shadow-sm mt-2`}
                          style={{
                            marginLeft,
                            marginRight,
                            pointerEvents: 'auto',
                          }}
                          title={tooltipText}
                        >
                          <div className="font-semibold truncate whitespace-nowrap">
                            {guestName}
                            {secondGuestName && ` + ${secondGuestName.split(' ')[0]}`}
                          </div>
                          <div className="text-[10px] opacity-75 truncate">
                            {nights}n • {booking.occupancyType === 'single' ? '1p' : '2p'}
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="font-semibold">Room Colors:</div>
          {rooms.map(room => {
            const color = getRoomColor(room.name);
            return (
              <div key={room.id} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded ${color.bg} border ${color.border}`} />
                <span>{room.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
