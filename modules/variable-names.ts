import _ from 'lodash';
import { ModuleDefinition, ResourceClass } from '../types';

export function buildVariableNames(variableNames = {}) {
  const r: string[] = [];
  const r2: string[] = [];
  _.each(variableNames, (v, k) => {
    r.push(`$${k}: ${v}`);
    r2.push(`${k}: $${k}`);
  });
  return {
    define: r.join(','),
    apply: r2.join(','),
  };
}

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    mounted(klass: ResourceClass) {
      Object.defineProperty(klass, 'variableNames', {
        get() {
          // return klass.introspection.queryArgumentTypes;
          return klass.$schema.getQuery(klass.objectsName).toVariableNames();
        },
      });
    },
    classMethods: {
      buildVariableNames,
    },
  };
  return mod;
};

export default useModule;
