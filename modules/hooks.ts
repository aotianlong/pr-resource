// hooks
import _ from 'lodash';
import { Resource, HookFunction, ModuleDefinition } from '../types';

const useModule = function useModule<T>() {
  const mod: ModuleDefinition = {
    mounted(klass) {
      klass._hooks = {};
    },
    classAttributes: {
      _hooks: {},
    },
    classMethods: {
      addHook(name: string, func: HookFunction) {
        this._hooks[name] ||= [];
        this._hooks[name].push(func);
      },
      runHooks(name: string, args = null) {
        const funcs = this._hooks[name];
        if (funcs) {
          _.each(funcs, (func) => {
            func.bind(this)(args);
          });
        } else {
          // console.error('hooks not found')
        }
      },
    },
  };
  return mod;
};

export default useModule;
