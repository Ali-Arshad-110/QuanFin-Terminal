export interface CityCoordinate {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const cityCoordinates: Record<string, CityCoordinate> = {
  // India
  "Mumbai": { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777 },
  "New Delhi": { name: "New Delhi", country: "India", lat: 28.6139, lng: 77.2090 },
  "Bangalore": { name: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946 },
  "Pune": { name: "Pune", country: "India", lat: 18.5204, lng: 73.8567 },
  "Chennai": { name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707 },
  "Hyderabad": { name: "Hyderabad", country: "India", lat: 17.3850, lng: 78.4867 },
  "Ahmedabad": { name: "Ahmedabad", country: "India", lat: 23.0225, lng: 72.5714 },
  "Kolkata": { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639 },
  "Gurugram": { name: "Gurugram", country: "India", lat: 28.4595, lng: 77.0266 },
  "Noida": { name: "Noida", country: "India", lat: 28.5355, lng: 77.3910 },
  
  // Global Financial Centers
  "New York": { name: "New York", country: "United States", lat: 40.7128, lng: -74.0060 },
  "London": { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  "Tokyo": { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },

  // Secondary Indian Industrial Hubs (High-Growth Tech/Manufacturing)
  "Surat": { name: "Surat", country: "India", lat: 21.1702, lng: 72.8311 },
  "Jaipur": { name: "Jaipur", country: "India", lat: 26.9124, lng: 75.7873 },
  "Lucknow": { name: "Lucknow", country: "India", lat: 26.8467, lng: 80.9462 },
  "Nagpur": { name: "Nagpur", country: "India", lat: 21.1458, lng: 79.0882 },
  "Indore": { name: "Indore", country: "India", lat: 22.7196, lng: 75.8577 },
  "Thane": { name: "Thane", country: "India", lat: 19.2183, lng: 72.9781 },
  "Bhopal": { name: "Bhopal", country: "India", lat: 23.2599, lng: 77.4126 },
  "Visakhapatnam": { name: "Visakhapatnam", country: "India", lat: 17.6868, lng: 83.2185 },
  "Pimpri-Chinchwad": { name: "Pimpri-Chinchwad", country: "India", lat: 18.6298, lng: 73.7997 },
  "Patna": { name: "Patna", country: "India", lat: 25.5941, lng: 85.1376 },
  "Vadodara": { name: "Vadodara", country: "India", lat: 22.3072, lng: 73.1812 },
  "Ghaziabad": { name: "Ghaziabad", country: "India", lat: 28.6692, lng: 77.4538 },
  "Ludhiana": { name: "Ludhiana", country: "India", lat: 30.9010, lng: 75.8573 },
  "Nashik": { name: "Nashik", country: "India", lat: 19.9975, lng: 73.7898 },
  "Faridabad": { name: "Faridabad", country: "India", lat: 28.4089, lng: 77.3178 },
  "Meerut": { name: "Meerut", country: "India", lat: 28.9845, lng: 77.7064 },
  "Rajkot": { name: "Rajkot", country: "India", lat: 22.3039, lng: 70.8022 },
  "Kalyan": { name: "Kalyan", country: "India", lat: 19.2403, lng: 73.1305 },
  "Varanasi": { name: "Varanasi", country: "India", lat: 25.3176, lng: 82.9739 },
  "Srinagar": { name: "Srinagar", country: "India", lat: 34.0837, lng: 74.7973 },
  "Aurangabad": { name: "Aurangabad", country: "India", lat: 19.8762, lng: 75.3433 },
  "Amritsar": { name: "Amritsar", country: "India", lat: 31.6340, lng: 74.8723 },
  "Jamshedpur": { name: "Jamshedpur", country: "India", lat: 22.8046, lng: 86.2029 },
  "Ranchi": { name: "Ranchi", country: "India", lat: 23.3441, lng: 85.3096 },
  "Coimbatore": { name: "Coimbatore", country: "India", lat: 11.0168, lng: 76.9558 },
  "Bhubaneswar": { name: "Bhubaneswar", country: "India", lat: 20.2961, lng: 85.8245 },
  "Guwahati": { name: "Guwahati", country: "India", lat: 26.1445, lng: 91.7362 },
  "Chandigarh": { name: "Chandigarh", country: "India", lat: 30.7333, lng: 76.7794 },
  "Mysore": { name: "Mysore", country: "India", lat: 12.2958, lng: 76.6394 },
  "Kochi": { name: "Kochi", country: "India", lat: 9.9312, lng: 76.2673 },
  "Mangalore": { name: "Mangalore", country: "India", lat: 12.9141, lng: 74.8560 },
  "Belgaum": { name: "Belgaum", country: "India", lat: 15.8497, lng: 74.4977 },
  "Udaipur": { name: "Udaipur", country: "India", lat: 24.5854, lng: 73.7125 },
  "Raipur": { name: "Raipur", country: "India", lat: 21.2514, lng: 81.6296 },
  "Kota": { name: "Kota", country: "India", lat: 25.2138, lng: 75.8648 },
  "Jabalpur": { name: "Jabalpur", country: "India", lat: 23.1672, lng: 79.9322 },
  "Gwalior": { name: "Gwalior", country: "India", lat: 26.2183, lng: 78.1828 },
  "Vijayawada": { name: "Vijayawada", country: "India", lat: 16.5062, lng: 80.6480 },
  "Madurai": { name: "Madurai", country: "India", lat: 9.9252, lng: 78.1198 },
  "Jodhpur": { name: "Jodhpur", country: "India", lat: 26.2389, lng: 73.0243 },
  "Salem": { name: "Salem", country: "India", lat: 11.6643, lng: 78.1460 },
  "Warangal": { name: "Warangal", country: "India", lat: 17.9689, lng: 79.5941 },
  "Tiruchirappalli": { name: "Tiruchirappalli", country: "India", lat: 10.7905, lng: 78.7047 },
  "Puducherry": { name: "Puducherry", country: "India", lat: 11.9416, lng: 79.8083 },
  "Hong Kong": { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  "Singapore": { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  "Shanghai": { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737 },
  "Beijing": { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074 },
  "Dubai": { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
  "Paris": { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  "Frankfurt": { name: "Frankfurt", country: "Germany", lat: 50.1109, lng: 8.6821 },
  "Zurich": { name: "Zurich", country: "Switzerland", lat: 47.3769, lng: 8.5417 },
  "Toronto": { name: "Toronto", country: "Canada", lat: 43.6510, lng: -79.3470 },
  "Sydney": { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  "Seoul": { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780 },
  "San Francisco": { name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194 },
  "Chicago": { name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298 },
  "Boston": { name: "Boston", country: "United States", lat: 42.3601, lng: -71.0589 },
  
  // Custom Global Tech & Mega-Cap Hubs
  "Cupertino": { name: "Cupertino", country: "United States", lat: 37.3230, lng: -122.0322 },
  "Redmond": { name: "Redmond", country: "United States", lat: 47.6740, lng: -122.1215 },
  "Santa Clara": { name: "Santa Clara", country: "United States", lat: 37.3541, lng: -121.9552 },
  "Mountain View": { name: "Mountain View", country: "United States", lat: 37.3861, lng: -122.0839 },
  "Seattle": { name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321 },
  "Menlo Park": { name: "Menlo Park", country: "United States", lat: 37.4529, lng: -122.1817 },
  "Austin": { name: "Austin", country: "United States", lat: 30.2672, lng: -97.7431 },
  "Omaha": { name: "Omaha", country: "United States", lat: 41.2565, lng: -95.9345 },
  "Indianapolis": { name: "Indianapolis", country: "United States", lat: 39.7684, lng: -86.1581 },
  "Palo Alto": { name: "Palo Alto", country: "United States", lat: 37.4419, lng: -122.1430 },
  "Purchase": { name: "Purchase", country: "United States", lat: 41.0401, lng: -73.7153 },
  "Bentonville": { name: "Bentonville", country: "United States", lat: 36.3729, lng: -94.2088 },
  "New Brunswick": { name: "New Brunswick", country: "United States", lat: 40.4862, lng: -74.4518 },
  "Spring": { name: "Spring", country: "United States", lat: 30.0799, lng: -95.4172 }, // ExxonMobil
  "Atlanta": { name: "Atlanta", country: "United States", lat: 33.7490, lng: -84.3880 },
  "Cincinnati": { name: "Cincinnati", country: "United States", lat: 39.1031, lng: -84.5120 },
  "San Ramon": { name: "San Ramon", country: "United States", lat: 37.7799, lng: -121.9780 },
  "Bagsvaerd": { name: "Bagsværd", country: "Denmark", lat: 55.7601, lng: 12.4512 },
  "Veldhoven": { name: "Veldhoven", country: "Netherlands", lat: 51.4063, lng: 5.4053 },
  "Shenzhen": { name: "Shenzhen", country: "China", lat: 22.5431, lng: 114.0579 },
  "Toyota City": { name: "Toyota City", country: "Japan", lat: 35.0820, lng: 137.1561 },
  "Hangzhou": { name: "Hangzhou", country: "China", lat: 30.2741, lng: 120.1551 },
  "Walldorf": { name: "Walldorf", country: "Germany", lat: 49.3056, lng: 8.6481 },
  "Munich": { name: "Munich", country: "Germany", lat: 48.1351, lng: 11.5820 },
  "Melbourne": { name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631 },
  "Dhahran": { name: "Dhahran", country: "Saudi Arabia", lat: 26.2870, lng: 50.1147 },
  "Hsinchu": { name: "Hsinchu", country: "Taiwan", lat: 24.8138, lng: 120.9675 },
  "Taoyuan": { name: "Taoyuan", country: "Taiwan", lat: 24.9930, lng: 121.3010 },
  "Taipei": { name: "Taipei", country: "Taiwan", lat: 25.0330, lng: 121.5654 },
  "Basel": { name: "Basel", country: "Switzerland", lat: 47.5596, lng: 7.5886 },
  "Irvine": { name: "Irvine", country: "United States", lat: 33.6846, lng: -117.8265 },
  "Armonk": { name: "Armonk", country: "United States", lat: 41.1265, lng: -73.7140 },
};

// Fallback lookup if city name differs slightly
export function getCityCoordinate(cityName: string): CityCoordinate | null {
  if (!cityName) return null;
  
  // Exact match
  if (cityCoordinates[cityName]) return cityCoordinates[cityName];
  
  // Case-insensitive match
  const lowerName = cityName.toLowerCase();
  for (const [key, val] of Object.entries(cityCoordinates)) {
    if (key.toLowerCase() === lowerName) return val;
  }
  
  // Contains match (e.g. "Mumbai (Bombay)" -> "Mumbai")
  for (const [key, val] of Object.entries(cityCoordinates)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return val;
    }
  }
  
  return null;
}
