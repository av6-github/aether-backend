// Calculates distance between two coordinates in meters using Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Return in meters
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Verifies if student location is within a reasonable radius of the room coord
export function verifyGeoFence(studentCoord, roomCoord, maxRadiusMeters = 50) {
  if (!studentCoord || !studentCoord.x || !studentCoord.y) return false;
  if (!roomCoord || !roomCoord.x || !roomCoord.y) return true; // Fail open if no room config

  const dist = getDistanceFromLatLonInKm(studentCoord.x, studentCoord.y, roomCoord.x, roomCoord.y);
  return dist <= maxRadiusMeters;
}
