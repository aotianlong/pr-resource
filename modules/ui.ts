import { ModuleDefinition, UIOptions, ResourceClass } from '../types';

const getDefaultUIOptions = (klass: ResourceClass): UIOptions => {
  return {
    component: {
      name: klass.objectName,
    },
    form: {
      default: '',
    },
    show: {
      breadcrumbs: true,
      favoritable: true,
      recommends: true,
      commentable: true,
      visitable: true,
      sharable: true,
      recommendable: true,
    },
    index: {
      breadcrumbs: true,
      type: 'table',
      modal: true,
      searchable: true,
    },
    edit: {
      breadcrumbs: true,
    },
    new: {
      breadcrumbs: true,
    },
  };
};

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    attributes: {
      ui: {},
    },
    mounted(klass: ResourceClass) {
      klass.ui = getDefaultUIOptions(klass);
    },
  };
  return mod;
};

export default useModule;
