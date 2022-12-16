import _ from 'lodash';
import { ModuleDefinition, Resource } from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    get(target: any, key: string, receiver?: any): any {
      let { serialize } = target.klass.options;
      if (serialize) {
        if (_.isString(serialize)) {
          serialize = [serialize];
        }
        if (_.includes(serialize, key)) {
          return JSON.parse(target._attributes[key]);
        }
      }
      throw new Error('not match');
    },
    set(target: any, key: string, value: any, receiver?: any) {
      let { serialize } = target.klass.options;
      if (serialize) {
        if (_.isString(serialize)) {
          serialize = [serialize];
        }
        if (_.includes(serialize, key)) {
          target._attributes[key] = JSON.stringify(value);
          return true;
        }
      }
      return false;
    },
  };
  return mod;
};

export default useModule;
