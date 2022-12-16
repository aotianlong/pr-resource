import { ModuleDefinition } from '../types';

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classMethods: {
      log(...args: any) {
        if (process.env.NODE_ENV === 'development') {
          console.log(...args);
        }
      },
    },
  };
  return mod;
};

export default useModule;
