import axios from 'axios';
import CryptoJS from 'crypto-js';

const defaults = {
  region: 'eu',
  baseUrl: 'https://openapi.tuyaeu.com'
};

function ensureSuccess(response) {
  const data = response.data;
  if (typeof data !== 'object') {
    throw new Error(data);
  }
  if (data.access_token) {
    return;
  }
  if (data.responseStatus === 'error') {
    throw new Error(data.errorMsg);
  }
  if (!data.header || data.header.code !== 'SUCCESS') {
    throw new Error(data.header.msg);
  }
}

function HomeAssistantClient(session) {
  let client;
  if (session) {
    client = createClient(session.region);
  }

  function createClient(region) {
    return axios.create({ baseURL: defaults.baseUrl, params: { region } });
  }

  function normalizeToken(token) {
    const result = {
      ...token,
      expires: Math.trunc(Date.now() / 1000) + token.expires_in,
    };
    delete result.expires_in;
    return result;
  }

  function generateSignature(timestamp, stringToSign) {
    return CryptoJS.HmacSHA256(stringToSign, '2b5e0611a699404ca756d25a93344f12').toString(CryptoJS.enc.Hex).toUpperCase();
  }

  async function requestToken() {
    const timestamp = Date.now();
    const stringToSign = `client_id=p9ajvtnnddup77whusvj&grant_type=1&timestamp=${timestamp}`;
    const sign = generateSignature(timestamp, stringToSign);

    const response = await axios.post(`${defaults.baseUrl}/v1.0/token?grant_type=1`, {}, {
      headers: {
        'client_id': 'p9ajvtnnddup77whusvj',
        'sign': sign,
        't': timestamp,
        'sign_method': 'HMAC-SHA256',
      },
    });

    return response.data.result.access_token;
  }

  this.login = async (userName, password, region) => {
    region = region || defaults.region;

    client = createClient(region);

    const token = await requestToken();
    session = {
      region,
      token: {
        access_token: token,
        refresh_token: '', // Refresh token handling can be added here if needed
        expires_in: 7200 // Typically, tokens expire in 2 hours
      },
    };
  };

  this.refreshAuthToken = async () => {
    // Refresh token implementation can be added here
  };

  this.getSession = () => session;

  this.dropSession = () => {
    session = null;
  };

  this.deviceDiscovery = async () => {
    const discoveryResponse = await client.post('/v1.0/devices/status', {
      accessToken: session.token.access_token,
    });
    console.debug('device discovery response', discoveryResponse.data);
    ensureSuccess(discoveryResponse);

    const payload = discoveryResponse.data.result;
    if (payload && payload.devices) {
      payload.devices = payload.devices
        .map((device) => {
          device.name = JSON.parse(`"${device.name}"`);

          if (device.dev_type === 'scene' && device.name.endsWith('#')) {
            device.dev_type = 'automation';
            device.name = device.name.replace(/\s*#$/, '');
          }

          return {
            id: device.id,
            name: device.name,
            type: device.dev_type,
            data: device.data,
            icon: device.icon,
          };
        })
        .filter((device) => device.type !== 'automation');
    }

    return discoveryResponse.data;
  };

  this.deviceControl = async (deviceId, action, fieldValue, fieldName = 'value') => {
    if (deviceId === 0) {
      return { header: { code: 'SUCCESS' } };
    }

    if (action === 'turnOnOff' && fieldName === 'value' && typeof fieldValue === 'boolean') {
      fieldValue = fieldValue ? 1 : 0;
    }

    const controlResponse = await client.post(`/v1.0/devices/${deviceId}/commands`, {
      commands: [
        {
          code: action,
          value: fieldValue
        }
      ]
    }, {
      headers: {
        'client_id': 'p9ajvtnnddup77whusvj',
        'access_token': session.token.access_token
      }
    });
    console.debug('device control response', `${action}: ${fieldName}=${fieldValue}`, controlResponse.data);
    ensureSuccess(controlResponse);
  };
}

export default {
  HomeAssistantClient,
};
