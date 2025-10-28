const PUBLISHER_A_URL = process.env.PUBLISHER_A_URL || 'http://publisher-a:8081';
const PUBLISHER_B_URL = process.env.PUBLISHER_B_URL || 'http://publisher-b:8082';

// Map hostnames to origin URLs
const HOST_MAP = {
  'site-a.local': PUBLISHER_A_URL,
  'localhost': PUBLISHER_A_URL, // Default for testing
  'site-b.local': PUBLISHER_B_URL
};

// Get origin URL for a given host
function getOriginUrl(host) {
  // Remove port from host if present
  const hostname = host.split(':')[0];
  
  // Check direct hostname match
  if (HOST_MAP[hostname]) {
    return HOST_MAP[hostname];
  }
  
  // Default to publisher-a for unknown hosts (for easier testing)
  console.log(`Unknown host ${hostname}, defaulting to publisher-a`);
  return PUBLISHER_A_URL;
}

module.exports = {
  getOriginUrl
};
