function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

export function detectTimetableClashes(incomingSlots, existingSlots) {
  const clashes = [];

  for (const incoming of incomingSlots) {
    const inStart = timeToMinutes(incoming.startTime);
    const inEnd = timeToMinutes(incoming.endTime);

    for (const existing of existingSlots) {
      if (existing.day !== incoming.day) continue;
      const exStart = timeToMinutes(existing.startTime);
      const exEnd = timeToMinutes(existing.endTime);

      const a = { start: inStart, end: inEnd };
      const b = { start: exStart, end: exEnd };

      if (!intervalsOverlap(a, b)) continue;

      // Room clash
      if (existing.roomId === incoming.roomId) {
        clashes.push({
          type: 'room',
          day: incoming.day,
          time: `${incoming.startTime}-${incoming.endTime}`,
          conflictingSlot: existing,
          inputSlot: incoming,
        });
      }

      // Faculty clash
      if (existing.facultyId === incoming.facultyId) {
        clashes.push({
          type: 'faculty',
          day: incoming.day,
          time: `${incoming.startTime}-${incoming.endTime}`,
          conflictingSlot: existing,
          inputSlot: incoming,
        });
      }
    }
  }

  // Generate smart suggestions
  const suggestions = generateSlotSuggestions(incomingSlots, existingSlots);

  return {
    hasClash: clashes.length > 0,
    clashes,
    suggestions,
  };
}

function generateSlotSuggestions(clashingSlots, existingSlots) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const standardSlots = [
    { startTime: '08:00', endTime: '09:00' },
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '11:00', endTime: '12:00' },
    { startTime: '14:00', endTime: '15:00' },
    { startTime: '15:00', endTime: '16:00' },
    { startTime: '16:00', endTime: '17:00' },
  ];

  const suggestions = [];
  const clashFacultyIds = new Set(clashingSlots.map(s => s.facultyId));

  outer: for (const day of days) {
    for (const slot of standardSlots) {
      if (suggestions.length >= 3) break outer;
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);

      const isBusy = existingSlots.some(ex => {
        if (ex.day !== day) return false;
        
        const facultyMatch = clashFacultyIds.has(ex.facultyId);
        const roomId = clashingSlots[0]?.roomId;
        const roomMatch = ex.roomId === roomId;
        const opEventMatch = ex.isOperationalEvent && ex.roomId === roomId; // for operational events
        
        if (!facultyMatch && !roomMatch && !opEventMatch) return false;
        
        return intervalsOverlap(
          { start, end },
          { start: timeToMinutes(ex.startTime), end: timeToMinutes(ex.endTime) }
        );
      });

      if (!isBusy) {
        const roomId = clashingSlots[0]?.roomId || 'TBD';
        suggestions.push({ day, ...slot, roomId });
      }
    }
  }

  return suggestions;
}
