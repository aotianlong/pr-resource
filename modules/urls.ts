import inflection from 'inflection';
import _ from 'lodash';
import {
  UrlOptions,
  ModuleDefinition,
  Resource,
  ResourceClass,
} from '../types';
import { base64json } from '../lib/utils';

const useModule = function useModule<T>(): ModuleDefinition {
  const definition: ModuleDefinition = {
    classMethods: {
      searchUrl() {
        return `/search/${this.klass.objectsName}`;
      },
      indexUrl(urlOptions: UrlOptions = {}) {
        let { objectsName } = this;
        objectsName = inflection.underscore(inflection.pluralize(objectsName));
        let url = `/${objectsName}`;
        if (urlOptions.parent) {
          if (_.isString(urlOptions.parent)) {
            url = `${urlOptions.parent}${url}`;
          } else {
            url = `${urlOptions.parent.showUrl()}${url}`;
          }
        }
        if (urlOptions?.module) {
          url = `/${urlOptions.module}${url}`;
        }
        return url;
      },
      newUrl(attributes = {}) {
        if (_.isEqual(attributes, {})) {
          return `/new/${this.objectsName}`;
        }
        const serializedAttributes = base64json.stringify(attributes);
        return `/new/${this.objectsName}/${serializedAttributes}`;
      },
      showUrl(id: string, urlOptions?: UrlOptions) {
        let module = urlOptions?.module || '';
        if (module) {
          module = `/${module}`;
        }
        return `${module}/show/${id}`;
      },
      editUrl(id: string, urlOptions?: UrlOptions) {
        let module = urlOptions?.module || '';
        if (module) {
          module = `/${module}`;
        }
        return `${module}/edit/${id}`;
      },
    },
    methods: {
      searchUrl() {
        return this.klass.searchUrl();
      },
      indexUrl() {
        const parentId = this.getParentId();
        if (parentId) {
          return `/show/${parentId}/${this.klass.objectsName}`;
        }
        return `/${this.klass.objectsName}`;
      },
      showUrl(urlOptions?: UrlOptions) {
        const url = this.klass.showUrl(this.id, urlOptions);
        const baseUrl = this.baseUrl();
        return baseUrl + url;
      },
      editUrl(urlOptions?: UrlOptions) {
        const url = this.klass.editUrl(this.id, urlOptions);
        const baseUrl = this.baseUrl();
        return baseUrl + url;
      },
      newUrl(attributes = {}) {
        return this.klass.newUrl(attributes);
      },
      baseUrl() {
        return '';
      },
    },
    computed: {},
  };
  return definition;
};

export default useModule;
