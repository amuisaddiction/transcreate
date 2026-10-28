import { config } from '../../config.js';
import { HttpQlooClient } from './HttpQlooClient.js';
import { IQlooClient } from './QlooClient.js';
import { SampleQlooClient } from './SampleQlooClient.js';

let instance: IQlooClient | null = null;

export function getQlooClient(): IQlooClient {
  if (instance) return instance;

  if (config.qlooApiKey && config.mode === 'live') {
    instance = new HttpQlooClient(config.qlooApiKey, config.qlooBaseUrl);
  } else {
    instance = new SampleQlooClient();
  }

  return instance;
}

export function resetQlooClient(): void {
  instance = null;
}
