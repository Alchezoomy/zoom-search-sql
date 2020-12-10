const hostDetails = require('../../host-details.json');

const defaultObject = {
  name: 'Alchemy Code Labs',
  pic_url: 'https://user-images.strikinglycdn.com/res/hrscywv4p/image/upload/c_limit,fl_lossy,h_300,w_300,f_auto,q_auto/983693/axmqlpjyo3zmeszdr9qt.png',
  color: '#FFFFFF'
};

module.exports = (host_id) => {
  const hostData = hostDetails[host_id];

  // my version here isn't necessarily smarter, just an alternative
  return hostData
    ? {
      name: `${hostData.first_name} ${hostData.last_name}`,
      pic_url: hostDetails[host_id].pic_url,
      color: hostDetails[host_id].color
    }
    : defaultObject;
};
