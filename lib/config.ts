import { ResourceConfig } from '../types';

const config: ResourceConfig = {
  i18n: {},
  maxDepth: 2,
  apollo: undefined,
  schema: undefined,
  modules: [],
};

const getConfig = () => {
  return config;
};

export { getConfig };
export default config;
